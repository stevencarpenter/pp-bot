import {getRecentVotes, getTopUsers, recordVote, updateUserScore} from '../storage/database';
import {pool} from '../db';
import {ensureSchema} from './helpers/schema';

beforeAll(async () => {
    await ensureSchema();
});

beforeEach(async () => {
    await pool.query('DELETE FROM vote_history');
    await pool.query('DELETE FROM leaderboard');
});

describe('storage edge cases', () => {
    test('updateUserScore accepts zero delta and returns existing score', async () => {
        await updateUserScore('U_ZERO', 5);
        const unchanged = await updateUserScore('U_ZERO', 0);
        expect(unchanged).toBe(5);
    });

    test('negative delta decreases score', async () => {
        await updateUserScore('U_NEG', 3);
        const newScore = await updateUserScore('U_NEG', -5);
        expect(newScore).toBe(-2);
    });

    test('getTopUsers limit respected', async () => {
        for (let i = 0; i < 10; i++) {
            await updateUserScore(`U_${i}`, i);
        }
        const top3 = await getTopUsers(3);
        expect(top3).toHaveLength(3);
        expect(top3[0].score).toBeGreaterThanOrEqual(top3[1].score);
        expect(top3[1].score).toBeGreaterThanOrEqual(top3[2].score);
    });

    test('getRecentVotes limit applied', async () => {
        await updateUserScore('U_TARGET', 1);
        for (let i = 0; i < 15; i++) {
            await recordVote(`V_${i}`, 'U_TARGET', '++');
        }
        const recent5 = await getRecentVotes('U_TARGET', 5);
        expect(recent5).toHaveLength(5);
        // Ensure ordering (created_at desc) by comparing timestamps
        for (let i = 1; i < recent5.length; i++) {
            expect(recent5[i - 1].createdAt!.getTime()).toBeGreaterThanOrEqual(recent5[i].createdAt!.getTime());
        }
    });
});
