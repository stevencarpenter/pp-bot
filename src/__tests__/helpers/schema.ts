import {pool} from '../../db';

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
    `;
    await pool.query(ddl);
    initialized = true;
}
