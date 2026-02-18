import { pool } from '../../db';

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  // Nicely formatted DDL with a sql tag comment for editor tooling.
  const ddl = /* sql */ `
        CREATE TABLE IF NOT EXISTS leaderboard
        (
            user_id    VARCHAR(20) PRIMARY KEY,
            score      INTEGER   DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard (user_id);

        CREATE TABLE IF NOT EXISTS thing_leaderboard
        (
            thing_name VARCHAR(64) PRIMARY KEY,
            score      INTEGER   DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

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
        CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_history_dedupe
            ON vote_history (voter_id, voted_user_id, channel_id, message_ts)
            WHERE channel_id IS NOT NULL AND message_ts IS NOT NULL;

        CREATE TABLE IF NOT EXISTS message_dedupe
        (
            id         SERIAL PRIMARY KEY,
            channel_id VARCHAR(20),
            message_ts VARCHAR(20),
            dedupe_key VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (channel_id, message_ts)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_message_dedupe_key ON message_dedupe (dedupe_key);
        CREATE INDEX IF NOT EXISTS idx_message_dedupe_created ON message_dedupe (created_at DESC);
    `;
  await pool.query(ddl);
  initialized = true;
}
