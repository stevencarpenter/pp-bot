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
  });
});
