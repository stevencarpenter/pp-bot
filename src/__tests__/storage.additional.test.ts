import {
  getRecentVotes,
  getUserScore,
  recordMessageIfNew,
  recordVote,
  updateUserScore,
} from '../storage/database';
import { pool } from '../db';
import { ensureSchema } from './helpers/schema';

describe('additional storage coverage', () => {
  beforeAll(async () => {
    await ensureSchema();
  });
  beforeEach(async () => {
    await pool.query('DELETE FROM vote_history');
    await pool.query('DELETE FROM leaderboard');
    await pool.query('DELETE FROM thing_leaderboard');
    await pool.query('DELETE FROM message_dedupe');
  });

  test('getUserScore returns 0 for non-existent user', async () => {
    const score = await getUserScore('U_UNKNOWN');
    expect(score).toBe(0);
  });

  test('recordVote with minimal optional params (undefined channel/message)', async () => {
    await updateUserScore('U_VOTED', 1);
    const recorded = await recordVote('U_VOTER', 'U_VOTED', '++');
    expect(recorded).toBe(true);
    const votes = await getRecentVotes('U_VOTED', 10);
    expect(votes.length).toBe(1);
    expect(votes[0].channelId).toBeUndefined();
    expect(votes[0].messageTs).toBeUndefined();
  });

  test('recordVote ignores duplicates for same message', async () => {
    await updateUserScore('U_VOTED', 1);
    const first = await recordVote('U_VOTER', 'U_VOTED', '++', {
      channelId: 'C1',
      messageTs: '123',
    });
    const second = await recordVote('U_VOTER', 'U_VOTED', '++', {
      channelId: 'C1',
      messageTs: '123',
    });
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  test('recordMessageIfNew detects duplicates', async () => {
    const first = await recordMessageIfNew('C2', '999');
    const second = await recordMessageIfNew('C2', '999');
    expect(first).toBe(true);
    expect(second).toBe(false);
  });
});
