#!/usr/bin/env ts-node
import { Client, Pool } from 'pg';
import logger from '../logger';
import { assertSecureDbSslPolicy, getDatabaseSslConfig } from '../security/db-ssl';

type MigrationOptions = {
  maxAttempts?: number;
  delayMs?: number;
};

async function migrate(poolOverride?: Pool, options?: MigrationOptions): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    logger.error('DATABASE_URL not set. Aborting migrations.');
    if (!poolOverride) {
      process.exit(1);
    }
    return false;
  }

  const connectionStringValue = connectionString;
  const isPgMem = connectionStringValue.startsWith('pgmem://');

  if (!isPgMem) {
    assertSecureDbSslPolicy();
  }

  let client: any;
  let shouldCloseClient = true;

  if (poolOverride) {
    client = poolOverride;
    shouldCloseClient = false;
  }

  const createClient = () => {
    if (isPgMem) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { newDb } = require('pg-mem');
      const db = newDb();
      const pgMem = db.adapters.createPg();
      return new pgMem.Client();
    }

    return new Client({
      connectionString: connectionStringValue,
      ssl: getDatabaseSslConfig().ssl,
    });
  };

  const ddl =
    // prettier-ignore
    `
      CREATE TABLE IF NOT EXISTS leaderboard
      (
          user_id    VARCHAR(20) PRIMARY KEY,
          score      INTEGER   DEFAULT 0 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard (user_id);
      CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);

      CREATE TABLE IF NOT EXISTS thing_leaderboard
      (
          thing_name VARCHAR(64) PRIMARY KEY,
          score      INTEGER   DEFAULT 0 NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_thing_leaderboard_score ON thing_leaderboard (score DESC);

      CREATE TABLE IF NOT EXISTS vote_history
      (
          id            SERIAL PRIMARY KEY,
          voter_id      VARCHAR(20) NOT NULL,
          voted_user_id VARCHAR(20) NOT NULL,
          vote_type     VARCHAR(2)  NOT NULL CHECK (vote_type IN ('++', '--')),
          channel_id    VARCHAR(20),
          message_ts    VARCHAR(20),
          created_at    TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_vote_history_user ON vote_history (voted_user_id);
      CREATE INDEX IF NOT EXISTS idx_vote_history_created ON vote_history (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_vote_history_channel_message ON vote_history (channel_id, message_ts);
      CREATE INDEX IF NOT EXISTS idx_vote_history_voter_created ON vote_history (voter_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_vote_history_channel_created ON vote_history (channel_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_vote_history_voter_target_created ON vote_history (voter_id, voted_user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_vote_history_downvote_voter_created ON vote_history (vote_type, voter_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS message_dedupe
      (
          id         SERIAL PRIMARY KEY,
          channel_id VARCHAR(20),
          message_ts VARCHAR(20),
          dedupe_key VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE (dedupe_key),
          UNIQUE (channel_id, message_ts)
      );
      CREATE INDEX IF NOT EXISTS idx_message_dedupe_created ON message_dedupe (created_at DESC);
  `;

  const upgradeMessageDedupeSql =
    // prettier-ignore
    `
      ALTER TABLE message_dedupe ADD COLUMN IF NOT EXISTS dedupe_key VARCHAR(255);
      UPDATE message_dedupe
      SET dedupe_key = COALESCE(dedupe_key, 'msg:' || channel_id || ':' || message_ts, 'legacy:' || id::text)
      WHERE dedupe_key IS NULL;
      ALTER TABLE message_dedupe ALTER COLUMN channel_id DROP NOT NULL;
      ALTER TABLE message_dedupe ALTER COLUMN message_ts DROP NOT NULL;
      ALTER TABLE message_dedupe ALTER COLUMN dedupe_key SET NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_message_dedupe_key ON message_dedupe (dedupe_key);
  `;

  const dedupeSql =
    // prettier-ignore
    `
      DELETE FROM vote_history
      WHERE channel_id IS NOT NULL
        AND message_ts IS NOT NULL
        AND id NOT IN (
          SELECT MIN(id)
          FROM vote_history
          WHERE channel_id IS NOT NULL
            AND message_ts IS NOT NULL
          GROUP BY voter_id, voted_user_id, channel_id, message_ts
        );
  `;

  const createDedupeIndexSql =
    // prettier-ignore
    `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_history_dedupe
          ON vote_history (voter_id, voted_user_id, channel_id, message_ts)
          WHERE channel_id IS NOT NULL AND message_ts IS NOT NULL;
  `;

  async function upgradeMessageDedupeSchema(): Promise<void> {
    if (isPgMem) {
      return;
    }
    await client.query(upgradeMessageDedupeSql);
  }

  async function dedupeVoteHistory(): Promise<void> {
    try {
      await client.query(dedupeSql);
      return;
    } catch (error) {
      if (!isPgMem) {
        throw error;
      }
    }

    const result = await client.query(
      `
        SELECT id, voter_id, voted_user_id, channel_id, message_ts
        FROM vote_history
        WHERE channel_id IS NOT NULL AND message_ts IS NOT NULL
        ORDER BY id;
      `
    );

    const seen = new Set<string>();
    for (const row of result.rows || []) {
      const key = `${row.voter_id}|${row.voted_user_id}|${row.channel_id}|${row.message_ts}`;
      if (seen.has(key)) {
        await client.query('DELETE FROM vote_history WHERE id = $1', [row.id]);
      } else {
        seen.add(key);
      }
    }
  }

  const maxAttempts = options?.maxAttempts ?? 10;
  const baseDelayMs = options?.delayMs ?? 500;

  if (!poolOverride) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        client = createClient();
        await client.connect();
        break;
      } catch (error) {
        if (client?.end) {
          try {
            await client.end();
          } catch {
            // ignore cleanup errors
          }
        }
        if (attempt === maxAttempts) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error('Failed to connect to database after retries:', message);
          process.exit(1);
          return false;
        }
        const message = error instanceof Error ? error.message : String(error);
        const delay = baseDelayMs * attempt;
        logger.info(
          `DB not ready (attempt ${attempt}/${maxAttempts}): ${message}. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  try {
    await client.query('BEGIN');
    await client.query(ddl);
    await upgradeMessageDedupeSchema();
    await dedupeVoteHistory();
    await client.query(createDedupeIndexSql);
    await client.query('COMMIT');
    logger.info('✅ Migration complete');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Migration failed:', error);
    process.exitCode = 1;
    return false;
  } finally {
    if (shouldCloseClient) {
      await client.end();
    }
  }
}

if (require.main === module) {
  migrate();
}

export default migrate;
