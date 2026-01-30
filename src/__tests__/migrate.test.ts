import { pool } from '../db';

// Import migrate function dynamically since it's a script file
// eslint-disable-next-line @typescript-eslint/no-var-requires
const migrate = require('../scripts/migrate').default;

// Use pg-mem ephemeral pool (already active via DATABASE_URL in setup)

describe('migration script', () => {
  test('executes without throwing and creates tables', async () => {
    await migrate(pool); // Pass the shared pool instance
    // Basic existence checks
    await expect(pool.query('SELECT * FROM leaderboard')).resolves.toBeTruthy();
    await expect(pool.query('SELECT * FROM vote_history')).resolves.toBeTruthy();
    await expect(pool.query('SELECT * FROM thing_leaderboard')).resolves.toBeTruthy();
    await expect(pool.query('SELECT * FROM message_dedupe')).resolves.toBeTruthy();
  });

  test('dedupes vote_history before creating unique index', async () => {
    if (process.env.DATABASE_URL?.startsWith('pgmem://')) {
      return;
    }
    await migrate(pool);
    await pool.query('DROP INDEX IF EXISTS idx_vote_history_dedupe');
    await pool.query('DELETE FROM vote_history');
    await pool.query(
      `INSERT INTO vote_history (voter_id, voted_user_id, vote_type, channel_id, message_ts)
       VALUES ('U1', 'U2', '++', 'C1', '123.456'),
              ('U1', 'U2', '++', 'C1', '123.456');`
    );

    await migrate(pool);

    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM vote_history
       WHERE voter_id = 'U1' AND voted_user_id = 'U2' AND channel_id = 'C1' AND message_ts = '123.456';`
    );
    expect(result.rows[0].count).toBe(1);
  });
});
