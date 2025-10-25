import { getRecentVotes, getUserScore, recordVote, updateUserScore } from '../storage/database';
import { pool } from '../db';
import { ensureSchema } from './helpers/schema';

describe('additional storage coverage', () => {
  beforeAll(async () => {
    await ensureSchema();
  });
  beforeEach(async () => {
    await pool.query('DELETE FROM vote_history');
    await pool.query('DELETE FROM leaderboard');
  });

  test('getUserScore returns 0 for non-existent user', async () => {
    const score = await getUserScore('U_UNKNOWN');
    expect(score).toBe(0);
  });

  test('recordVote with minimal optional params (undefined channel/message)', async () => {
    await updateUserScore('U_VOTED', 1);
    await recordVote('U_VOTER', 'U_VOTED', '++');
    const votes = await getRecentVotes('U_VOTED', 10);
    expect(votes.length).toBe(1);
    expect(votes[0].channelId).toBeUndefined();
    expect(votes[0].messageTs).toBeUndefined();
  });
});
