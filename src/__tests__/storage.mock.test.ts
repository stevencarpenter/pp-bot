// @ts-ignore - using JS entrypoint type-declared in index.d.ts
import { updateLeaderboard } from '../../index.js';

describe('in-memory leaderboard update (mock storage)', () => {
  test('increments and decrements without DB', () => {
    const lb: Record<string, number> = {};
    expect(updateLeaderboard(lb, 'U1', '++')).toBe(1);
    expect(updateLeaderboard(lb, 'U1', '--')).toBe(0);
  });
});
