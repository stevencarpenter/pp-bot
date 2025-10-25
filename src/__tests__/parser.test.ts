import { parseVote } from '../utils/vote';
import { updateLeaderboard } from '../utils/leaderboard';

// Added legacy test cases migrated from old index.test.js

describe('parseVote (comprehensive)', () => {
  test('single ++ vote', () => {
    expect(parseVote('<@U12345678> ++')).toEqual([{ userId: 'U12345678', action: '++' }]);
  });
  test('single -- vote', () => {
    expect(parseVote('<@U12345678> --')).toEqual([{ userId: 'U12345678', action: '--' }]);
  });
  test('vote with trailing text', () => {
    expect(parseVote('<@U12345678> ++ for being awesome!')).toEqual([
      { userId: 'U12345678', action: '++' },
    ]);
  });
  test('vote with emojis after', () => {
    expect(parseVote('<@U12345678> ++ 🎉 🎊 great job!')).toEqual([
      { userId: 'U12345678', action: '++' },
    ]);
  });
  test('multiple votes in one line', () => {
    expect(parseVote('<@U12345678> ++ and <@U87654321> --')).toEqual([
      { userId: 'U12345678', action: '++' },
      { userId: 'U87654321', action: '--' },
    ]);
  });
  test('vote without space before ++', () => {
    expect(parseVote('<@U12345678>++')).toEqual([{ userId: 'U12345678', action: '++' }]);
  });
  test('ignores text with mention but no vote', () => {
    expect(parseVote('Hello <@U12345678> how are you?')).toEqual([]);
  });
  test('ignores invalid reversed pattern', () => {
    expect(parseVote('++ <@U12345678>')).toEqual([]);
  });
});

describe('updateLeaderboard (TS migrated)', () => {
  test('increments new user', () => {
    const lb: Record<string, number> = {};
    expect(updateLeaderboard(lb, 'U1', '++')).toBe(1);
  });
  test('decrements new user', () => {
    const lb: Record<string, number> = {};
    expect(updateLeaderboard(lb, 'U1', '--')).toBe(-1);
  });
  test('increments existing user', () => {
    const lb: Record<string, number> = { U1: 5 };
    expect(updateLeaderboard(lb, 'U1', '++')).toBe(6);
  });
  test('decrements existing user', () => {
    const lb: Record<string, number> = { U1: 5 };
    expect(updateLeaderboard(lb, 'U1', '--')).toBe(4);
  });
  test('can go negative', () => {
    const lb: Record<string, number> = { U1: 0 };
    expect(updateLeaderboard(lb, 'U1', '--')).toBe(-1);
  });
});
