#!/usr/bin/env ts-node
import {Client, Pool} from 'pg';
import logger from '../logger';

type MigrationOptions = {
    maxAttempts?: number;
    delayMs?: number;
};

async function migrate(poolOverride?: Pool, options?: MigrationOptions): Promise<boolean> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        logger.error('DATABASE_URL not set. Aborting migrations.');
        if (!poolOverride) {
            // CLI usage without pool - use process.exit
            process.exit(1);
        }
        // Programmatic usage with pool - return false
        return false;
    }
    const connectionStringValue = connectionString;

    // Use provided pool for testing, or create a new client
    let client: any;
    let shouldCloseClient = true;

    if (poolOverride) {
        // For testing: use the shared pool directly (no client closing)
        client = poolOverride;
        shouldCloseClient = false;
    }

    const createClient = () => {
        if (connectionStringValue.startsWith('pgmem://')) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const {newDb} = require('pg-mem');
            const db = newDb();
            const pgMem = db.adapters.createPg();
            return new pgMem.Client();
        }
        return new Client({
            connectionString: connectionStringValue,
            ssl: process.env.NODE_ENV === 'production' ? {rejectUnauthorized: false} : false
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

            CREATE TABLE IF NOT EXISTS message_dedupe
            (
                id         SERIAL PRIMARY KEY,
                channel_id VARCHAR(20) NOT NULL,
                message_ts VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (channel_id, message_ts)
            );
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

    async function dedupeVoteHistory(): Promise<void> {
        try {
            await client.query(dedupeSql);
            return;
        } catch (e) {
            if (!connectionStringValue.startsWith('pgmem://')) {
                throw e;
            }
        }

        // Fallback for pg-mem: dedupe in JS to avoid unsupported SQL constructs.
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
            } catch (e: any) {
                if (client?.end) {
                    try {
                        await client.end();
                    } catch {
                        // ignore cleanup errors
                    }
                }
                if (attempt === maxAttempts) {
                    logger.error('Failed to connect to database after retries:', e.message);
                    // CLI usage without pool - use process.exit
                    process.exit(1);
                    return false;
                }
                const delay = baseDelayMs * attempt;
                logger.info(
                    `DB not ready (attempt ${attempt}/${maxAttempts}): ${e.message}. Retrying in ${delay}ms...`
                );
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    try {
        await client.query('BEGIN');
        await client.query(ddl);
        await dedupeVoteHistory();
        await client.query(createDedupeIndexSql);
        await client.query('COMMIT');
        logger.info('✅ Migration complete');
        return true;
    } catch (e) {
        await client.query('ROLLBACK');
        logger.error('Migration failed:', e);
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
