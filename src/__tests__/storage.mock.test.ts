import {updateLeaderboard} from '../utils/leaderboard';

describe('in-memory leaderboard update (mock storage)', () => {
    test('increments and decrements without DB', () => {
        const lb: Record<string, number> = {};
        expect(updateLeaderboard(lb, 'U1', '++')).toBe(1);
        expect(updateLeaderboard(lb, 'U1', '--')).toBe(0);
    });
});
