import {
  getTopThings,
  getTopUsers,
  getUserScore,
  recordVoteAndUpdateUserScore,
  updateThingScore,
} from '../storage/database';
import { ensureSchema } from './helpers/schema';

beforeAll(async () => {
  await ensureSchema();
});

describe('pg-mem storage operations', () => {
  test('user votes insert and increment scores', async () => {
    const v1 = await recordVoteAndUpdateUserScore('U_VOTER', 'U_X', '++', 2);
    expect(v1).toEqual({ recorded: true, score: 2 });
    const v2 = await recordVoteAndUpdateUserScore('U_VOTER', 'U_X', '++', 3);
    expect(v2).toEqual({ recorded: true, score: 5 });
    const fetched = await getUserScore('U_X');
    expect(fetched).toBe(5);
  });

  test('getTopUsers ordering', async () => {
    await recordVoteAndUpdateUserScore('U_VOTER', 'U_Y', '++', 10);
    await recordVoteAndUpdateUserScore('U_VOTER', 'U_Z', '++', 1);
    const top = await getTopUsers(3);
    expect(top.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
    }
  });

  test('thing leaderboard operations', async () => {
    const first = await updateThingScore('broncos', 1);
    expect(first).toBe(1);
    const score = await updateThingScore('broncos', 4);
    await updateThingScore('avalanche', 2);
    expect(score).toBe(5);
    const topThings = await getTopThings(5);
    expect(topThings.length).toBeGreaterThanOrEqual(2);
    expect(topThings[0].score).toBeGreaterThanOrEqual(topThings[1].score);
  });
});
