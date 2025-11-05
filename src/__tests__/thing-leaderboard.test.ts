import { ensureSchema } from './helpers/schema';
import { getPool } from '../storage/pool';
import { updateThingScore, getTopThings, updateUserScore, getTopUsers } from '../storage/database';

describe('Thing leaderboard integration', () => {
  beforeAll(async () => {
    await ensureSchema();
  });

  afterAll(async () => {
    const pool = getPool();
    if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
  });

  it('should update thing score', async () => {
    const score1 = await updateThingScore('twinkies', 1);
    expect(score1).toBe(1);

    const score2 = await updateThingScore('twinkies', 1);
    expect(score2).toBe(2);

    const score3 = await updateThingScore('nuggets', 1);
    expect(score3).toBe(1);
  });

  it('should get top things', async () => {
    await updateThingScore('thing1', 5);
    await updateThingScore('thing2', 3);
    await updateThingScore('thing3', 7);

    const topThings = await getTopThings(2);
    expect(topThings).toHaveLength(2);
    expect(topThings[0].thing_name).toBe('thing3');
    expect(topThings[0].score).toBe(7);
    expect(topThings[1].thing_name).toBe('thing1');
    expect(topThings[1].score).toBe(5);
  });

  it('should maintain separate user and thing leaderboards', async () => {
    await updateUserScore('U123', 10);
    await updateThingScore('pizza', 10);

    const topUsers = await getTopUsers(10);
    const topThings = await getTopThings(10);

    expect(topUsers.some((u) => u.user_id === 'U123')).toBe(true);
    expect(topThings.some((t) => t.thing_name === 'pizza')).toBe(true);

    // Ensure they're separate
    expect(topUsers.every((u) => typeof u.user_id === 'string')).toBe(true);
    expect(topThings.every((t) => typeof t.thing_name === 'string')).toBe(true);
  });

  it('should handle negative scores for things', async () => {
    await updateThingScore('bad-thing', -5);
    const score = await updateThingScore('bad-thing', -3);
    expect(score).toBe(-8);
  });
});
