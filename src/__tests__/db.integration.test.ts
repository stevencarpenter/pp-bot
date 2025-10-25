/**
 * Database integration tests.
 * These will be skipped automatically if DATABASE_URL is not provided.
 */

const hasDb = !!process.env.DATABASE_URL;

// Use commonjs require for existing JS bridge
// eslint-disable-next-line @typescript-eslint/no-var-requires
const storage = require('../../storage');

const schemaSql = `
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id VARCHAR(20) PRIMARY KEY,
  score INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS vote_history (
  id SERIAL PRIMARY KEY,
  voter_id VARCHAR(20) NOT NULL,
  voted_user_id VARCHAR(20) NOT NULL,
  vote_type VARCHAR(2) NOT NULL CHECK (vote_type IN ('++', '--')),
  channel_id VARCHAR(20),
  message_ts VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
`;

let pool: import('pg').Pool; // explicit for test scope reuse
describe('database integration', () => {
  if (!hasDb) {
    it.skip('skipped because DATABASE_URL is not set', () => {});
    return;
  }

  beforeAll(async () => {
    pool = require('../../db');
    for (const stmt of schemaSql.split(';')) {
      const sql = stmt.trim();
      if (sql) await pool.query(sql);
    }
    await pool.query('DELETE FROM vote_history');
    await pool.query('DELETE FROM leaderboard');
  });

  afterAll(async () => {
    try { await pool.end(); } catch {}
  });

  test('updateUserScore inserts then increments', async () => {
    const first = await storage.updateUserScore('U_DB_USER', 1);
    expect(first).toBe(1);
    const second = await storage.updateUserScore('U_DB_USER', 2);
    expect(second).toBe(3);
    const fetched = await storage.getUserScore('U_DB_USER');
    expect(fetched).toBe(3);
  });

  test('recordVote stores vote history', async () => {
    await storage.recordVote('U_VOTER', 'U_DB_USER', '++', 'C123', '123.456');
    const { rows } = await pool.query('SELECT * FROM vote_history WHERE voted_user_id = $1', ['U_DB_USER']);
    expect(rows.length).toBeGreaterThan(0);
  });

  test('getTopUsers returns ordered users', async () => {
    await storage.updateUserScore('U_DB_USER2', 5);
    const top = await storage.getTopUsers(5);
    expect(top[0].score).toBeGreaterThanOrEqual(top[top.length - 1].score);
  });
});
