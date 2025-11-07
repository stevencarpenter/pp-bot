/**
 * Tests for types.ts exports
 */
import {updateLeaderboard} from '../types';

describe('types module', () => {
    test('should export updateLeaderboard function', () => {
        expect(typeof updateLeaderboard).toBe('function');
    });

    test('updateLeaderboard should increment scores correctly', () => {
        const leaderboard: Record<string, number> = {
            U123: 5,
        };

        const newScore = updateLeaderboard(leaderboard, 'U123', '++');

        expect(newScore).toBe(6);
        expect(leaderboard.U123).toBe(6);
    });

    test('updateLeaderboard should decrement scores correctly', () => {
        const leaderboard: Record<string, number> = {
            U456: 3,
        };

        const newScore = updateLeaderboard(leaderboard, 'U456', '--');

        expect(newScore).toBe(2);
        expect(leaderboard.U456).toBe(2);
    });

    test('updateLeaderboard should handle new users', () => {
        const leaderboard: Record<string, number> = {};

        const newScore = updateLeaderboard(leaderboard, 'U999', '++');

        expect(newScore).toBe(1);
        expect(leaderboard.U999).toBe(1);
    });
});
