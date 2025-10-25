#!/usr/bin/env node
/* Migration script for pp-bot PostgreSQL schema */
const { Client } = require('pg');

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set. Aborting migrations.');
    process.exit(1);
  }
  const client = new Client({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  const ddl = `
  CREATE TABLE IF NOT EXISTS leaderboard (
    user_id VARCHAR(20) PRIMARY KEY,
    score INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);

  CREATE TABLE IF NOT EXISTS vote_history (
    id SERIAL PRIMARY KEY,
    voter_id VARCHAR(20) NOT NULL,
    voted_user_id VARCHAR(20) NOT NULL,
    vote_type VARCHAR(2) NOT NULL CHECK (vote_type IN ('++','--')),
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
      await client.connect();
      break;
    } catch (e) {
      if (attempt === maxAttempts) {
        console.error('Failed to connect to database after retries:', e.message);
        process.exit(1);
      }
      const delay = 500 * attempt;
      console.log(`DB not ready (attempt ${attempt}/${maxAttempts}): ${e.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  try {
    await client.query('BEGIN');
    await client.query(ddl);
    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
