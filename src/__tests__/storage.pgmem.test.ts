import {
  getRecentVotes,
  getTopUsers,
  getUserScore,
  recordVote,
  updateUserScore,
} from '../storage/database';
import { ensureSchema } from './helpers/schema';

beforeAll(async () => {
  await ensureSchema();
});

describe('pg-mem storage operations', () => {
  test('updateUserScore inserts and increments', async () => {
    const v1 = await updateUserScore('U_X', 2);
    expect(v1).toBe(2);
    const v2 = await updateUserScore('U_X', 3);
    expect(v2).toBe(5);
    const fetched = await getUserScore('U_X');
    expect(fetched).toBe(5);
  });

  test('getTopUsers ordering', async () => {
    await updateUserScore('U_Y', 10);
    await updateUserScore('U_Z', 1);
    const top = await getTopUsers(3);
    expect(top.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
    }
  });

  test('recordVote and getRecentVotes', async () => {
    await recordVote('U_VOTER', 'U_Y', '++', 'C1', '123');
    const votes = await getRecentVotes('U_Y');
    expect(votes[0]).toMatchObject({ votedUserId: 'U_Y', voteType: '++' });
    expect(votes[0].createdAt).toBeInstanceOf(Date);
  });
});
