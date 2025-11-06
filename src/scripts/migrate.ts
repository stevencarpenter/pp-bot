#!/usr/bin/env ts-node
import {Client} from 'pg';
import logger from '../logger';

async function migrate(poolOverride?: any): Promise<boolean> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        logger.error('DATABASE_URL not set. Aborting migrations.');
        process.exit(1);
    }

    // Use provided pool for testing, or create a new client
    let client: any;
    let shouldCloseClient = true;

    if (poolOverride) {
        // For testing: use the shared pool directly (no client closing)
        client = poolOverride;
        shouldCloseClient = false;
    } else if (connectionString.startsWith('pgmem://')) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const {newDb} = require('pg-mem');
        const db = newDb();
        const pgMem = db.adapters.createPg();
        client = new pgMem.Client();
    } else {
        client = new Client({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? {rejectUnauthorized: false} : false
        });
    }

    const ddl =
      // prettier-ignore
      `
        CREATE TABLE IF NOT EXISTS leaderboard (
            user_id VARCHAR(20) PRIMARY KEY,
            score INTEGER DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);

        CREATE TABLE IF NOT EXISTS thing_leaderboard (
            thing_name VARCHAR(64) PRIMARY KEY,
            score INTEGER DEFAULT 0 NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_thing_leaderboard_score ON thing_leaderboard(score DESC);

        CREATE TABLE IF NOT EXISTS vote_history (
            id SERIAL PRIMARY KEY,
            voter_id VARCHAR(20) NOT NULL,
            voted_user_id VARCHAR(20) NOT NULL,
            vote_type VARCHAR(2) NOT NULL CHECK (vote_type IN ('++', '--')),
            channel_id VARCHAR(20),
            message_ts VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_vote_history_user ON vote_history(voted_user_id);
        CREATE INDEX IF NOT EXISTS idx_vote_history_created ON vote_history(created_at DESC);
    `;

    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Only connect if we need to (not using poolOverride)
            if (shouldCloseClient) {
                await client.connect();
            }
            break;
        } catch (e: any) {
            if (attempt === maxAttempts) {
                logger.error('Failed to connect to database after retries:', e.message);
                process.exit(1);
            }
            const delay = 500 * attempt;
            logger.info(`DB not ready (attempt ${attempt}/${maxAttempts}): ${e.message}. Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    try {
        await client.query('BEGIN');
        await client.query(ddl);
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
