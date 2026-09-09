/**
 * Database integration tests.
 * These will be skipped automatically if DATABASE_URL is not provided.
 */

const hasDb = !!process.env.DATABASE_URL;

import { pool as sharedPool } from '../db';
import * as storage from '../storage/database';
import { ensureSchema } from './helpers/schema';

let pool: import('pg').Pool; // explicit for test scope reuse
describe('database integration', () => {
  if (!hasDb) {
    it.skip('skipped because DATABASE_URL is not set', () => {});
    return;
  }

  beforeAll(async () => {
    pool = sharedPool;
    await ensureSchema();
    await pool.query('DELETE FROM vote_history');
    await pool.query('DELETE FROM leaderboard');
    await pool.query('DELETE FROM thing_leaderboard');
    await pool.query('DELETE FROM message_dedupe');
  });

  afterAll(async () => {
    await pool.query('SELECT 1');
  });

  test('user votes insert then increment scores', async () => {
    const first = await storage.recordVoteAndUpdateUserScore('U_VOTER', 'U_DB_USER', '++', 1);
    expect(first).toEqual({ recorded: true, score: 1 });
    const second = await storage.recordVoteAndUpdateUserScore('U_VOTER', 'U_DB_USER', '++', 2);
    expect(second).toEqual({ recorded: true, score: 3 });
    const fetched = await storage.getUserScore('U_DB_USER');
    expect(fetched).toBe(3);
  });

  test('user votes store vote history', async () => {
    const result = await storage.recordVoteAndUpdateUserScore('U_VOTER', 'U_DB_USER', '++', 1, {
      channelId: 'C123',
      messageTs: '123.456',
    });
    expect(result.recorded).toBe(true);
    const { rows } = await pool.query(
      'SELECT voter_id, voted_user_id, vote_type FROM vote_history WHERE channel_id = $1 AND message_ts = $2',
      ['C123', '123.456']
    );
    expect(rows).toEqual([{ voter_id: 'U_VOTER', voted_user_id: 'U_DB_USER', vote_type: '++' }]);
  });

  test('getTopUsers returns ordered users', async () => {
    await storage.recordVoteAndUpdateUserScore('U_VOTER', 'U_DB_USER2', '++', 5);
    const top = await storage.getTopUsers(5);
    expect(top[0].score).toBeGreaterThanOrEqual(top[top.length - 1].score);
  });
});
