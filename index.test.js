const { parseVote, updateLeaderboard } = require('./index');

describe('parseVote', () => {
  test('parses single ++ vote', () => {
    const text = '<@U12345678> ++';
    const result = parseVote(text);
    expect(result).toEqual([
      { userId: 'U12345678', action: '++' }
    ]);
  });

  test('parses single -- vote', () => {
    const text = '<@U12345678> --';
    const result = parseVote(text);
    expect(result).toEqual([
      { userId: 'U12345678', action: '--' }
    ]);
  });

  test('parses vote with text after', () => {
    const text = '<@U12345678> ++ for being awesome!';
    const result = parseVote(text);
    expect(result).toEqual([
      { userId: 'U12345678', action: '++' }
    ]);
  });

  test('parses vote with emojis after', () => {
    const text = '<@U12345678> ++ 🎉 🎊 great job!';
    const result = parseVote(text);
    expect(result).toEqual([
      { userId: 'U12345678', action: '++' }
    ]);
  });

  test('parses multiple votes in one message', () => {
    const text = '<@U12345678> ++ and <@U87654321> --';
    const result = parseVote(text);
    expect(result).toEqual([
      { userId: 'U12345678', action: '++' },
      { userId: 'U87654321', action: '--' }
    ]);
  });

  test('handles vote without space before ++', () => {
    const text = '<@U12345678>++';
    const result = parseVote(text);
    expect(result).toEqual([
      { userId: 'U12345678', action: '++' }
    ]);
  });

  test('ignores text without votes', () => {
    const text = 'Hello <@U12345678> how are you?';
    const result = parseVote(text);
    expect(result).toEqual([]);
  });

  test('ignores invalid patterns', () => {
    const text = '++ <@U12345678>';
    const result = parseVote(text);
    expect(result).toEqual([]);
  });
});

describe('updateLeaderboard', () => {
  test('increments score for new user with ++', () => {
    const leaderboard = {};
    const score = updateLeaderboard(leaderboard, 'U12345678', '++');
    expect(score).toBe(1);
    expect(leaderboard['U12345678']).toBe(1);
  });

  test('decrements score for new user with --', () => {
    const leaderboard = {};
    const score = updateLeaderboard(leaderboard, 'U12345678', '--');
    expect(score).toBe(-1);
    expect(leaderboard['U12345678']).toBe(-1);
  });

  test('increments existing score', () => {
    const leaderboard = { 'U12345678': 5 };
    const score = updateLeaderboard(leaderboard, 'U12345678', '++');
    expect(score).toBe(6);
    expect(leaderboard['U12345678']).toBe(6);
  });

  test('decrements existing score', () => {
    const leaderboard = { 'U12345678': 5 };
    const score = updateLeaderboard(leaderboard, 'U12345678', '--');
    expect(score).toBe(4);
    expect(leaderboard['U12345678']).toBe(4);
  });

  test('can go negative', () => {
    const leaderboard = { 'U12345678': 0 };
    const score = updateLeaderboard(leaderboard, 'U12345678', '--');
    expect(score).toBe(-1);
    expect(leaderboard['U12345678']).toBe(-1);
  });
});
