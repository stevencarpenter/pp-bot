import migrate from '../scripts/migrate';
import {pool} from '../db';

// Use pg-mem ephemeral pool (already active via DATABASE_URL in setup)

describe('migration script', () => {
    test('executes without throwing and creates tables', async () => {
        await migrate();
        // Basic existence checks
        await expect(pool.query('SELECT * FROM leaderboard')).resolves.toBeTruthy();
        await expect(pool.query('SELECT * FROM vote_history')).resolves.toBeTruthy();
    });
});

