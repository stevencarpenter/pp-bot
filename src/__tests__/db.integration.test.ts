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

  test('updateUserScore inserts then increments', async () => {
    const first = await storage.updateUserScore('U_DB_USER', 1);
    expect(first).toBe(1);
    const second = await storage.updateUserScore('U_DB_USER', 2);
    expect(second).toBe(3);
    const fetched = await storage.getUserScore('U_DB_USER');
    expect(fetched).toBe(3);
  });

  test('recordVote stores vote history', async () => {
    const recorded = await storage.recordVote('U_VOTER', 'U_DB_USER', '++', {
      channelId: 'C123',
      messageTs: '123.456',
    });
    expect(recorded).toBe(true);
    const { rows } = await pool.query('SELECT * FROM vote_history WHERE voted_user_id = $1', [
      'U_DB_USER',
    ]);
    expect(rows.length).toBeGreaterThan(0);
  });

  test('getTopUsers returns ordered users', async () => {
    await storage.updateUserScore('U_DB_USER2', 5);
    const top = await storage.getTopUsers(5);
    expect(top[0].score).toBeGreaterThanOrEqual(top[top.length - 1].score);
  });
});
