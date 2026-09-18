import { getUserScore, recordVoteAndUpdateUserScore } from '../storage/database';
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

  test('user votes persist without optional channel/message metadata', async () => {
    const result = await recordVoteAndUpdateUserScore('U_VOTER', 'U_VOTED', '++', 1);
    expect(result).toEqual({ recorded: true, score: 1 });
    const { rows } = await pool.query(
      'SELECT channel_id, message_ts FROM vote_history WHERE voted_user_id = $1',
      ['U_VOTED']
    );
    expect(rows).toEqual([{ channel_id: null, message_ts: null }]);
  });

  test('recordVoteAndUpdateUserScore applies both writes atomically for user votes', async () => {
    const first = await recordVoteAndUpdateUserScore('U_VOTER_A', 'U_ATOMIC', '++', 1, {
      channelId: 'C10',
      messageTs: '100.1',
    });
    expect(first.recorded).toBe(true);
    expect(first.score).toBe(1);

    const duplicate = await recordVoteAndUpdateUserScore('U_VOTER_A', 'U_ATOMIC', '++', 1, {
      channelId: 'C10',
      messageTs: '100.1',
    });
    expect(duplicate.recorded).toBe(false);
    expect(duplicate.score).toBeUndefined();

    const score = await getUserScore('U_ATOMIC');
    expect(score).toBe(1);
  });

  test('recordVoteAndUpdateUserScore applies larger positive deltas', async () => {
    const result = await recordVoteAndUpdateUserScore('U_VOTER_B', 'U_BONUS', '++', 3, {
      channelId: 'C11',
      messageTs: '100.2',
    });

    expect(result.recorded).toBe(true);
    expect(result.score).toBe(3);
  });
});
