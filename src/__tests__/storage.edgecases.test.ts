import { getTopUsers, recordVoteAndUpdateUserScore } from '../storage/database';
import { pool } from '../db';
import { ensureSchema } from './helpers/schema';

beforeAll(async () => {
  await ensureSchema();
});

beforeEach(async () => {
  await pool.query('DELETE FROM vote_history');
  await pool.query('DELETE FROM leaderboard');
  await pool.query('DELETE FROM thing_leaderboard');
  await pool.query('DELETE FROM message_dedupe');
});

describe('storage edge cases', () => {
  test('a zero delta returns the existing user score', async () => {
    await recordVoteAndUpdateUserScore('U_VOTER', 'U_ZERO', '++', 5);
    const unchanged = await recordVoteAndUpdateUserScore('U_VOTER', 'U_ZERO', '++', 0);
    expect(unchanged).toEqual({ recorded: true, score: 5 });
  });

  test('negative delta decreases score', async () => {
    await recordVoteAndUpdateUserScore('U_VOTER', 'U_NEG', '++', 3);
    const result = await recordVoteAndUpdateUserScore('U_VOTER', 'U_NEG', '--', -5);
    expect(result).toEqual({ recorded: true, score: -2 });
  });

  test('getTopUsers limit respected', async () => {
    for (let i = 0; i < 10; i++) {
      await recordVoteAndUpdateUserScore('U_VOTER', `U_${i}`, '++', i);
    }
    const top3 = await getTopUsers(3);
    expect(top3).toHaveLength(3);
    expect(top3[0].score).toBeGreaterThanOrEqual(top3[1].score);
    expect(top3[1].score).toBeGreaterThanOrEqual(top3[2].score);
  });
});
