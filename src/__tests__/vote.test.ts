import { parseVote } from '../utils/vote';

describe('parseVote (TS)', () => {
  it('parses ++', () => {
    expect(parseVote('<@U123> ++')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '++', scoreDelta: 1 },
    ]);
  });
  it('parses --', () => {
    expect(parseVote('<@U123> --')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '--', scoreDelta: -1 },
    ]);
  });
  it('parses multiple', () => {
    expect(parseVote('<@U1> ++ and <@U2> --')).toEqual([
      { targetId: 'U1', targetType: 'user', action: '++', scoreDelta: 1 },
      { targetId: 'U2', targetType: 'user', action: '--', scoreDelta: -1 },
    ]);
  });
  it('parses user IDs with lowercase letters', () => {
    expect(parseVote('<@U123abc> ++')).toEqual([
      { targetId: 'U123abc', targetType: 'user', action: '++', scoreDelta: 1 },
    ]);
    expect(parseVote('<@UaBcDeF123> --')).toEqual([
      { targetId: 'UaBcDeF123', targetType: 'user', action: '--', scoreDelta: -1 },
    ]);
  });
  it('parses mixed case user IDs in multiple votes', () => {
    expect(parseVote('<@U1A2B3c> ++ and <@UxYz789> --')).toEqual([
      { targetId: 'U1A2B3c', targetType: 'user', action: '++', scoreDelta: 1 },
      { targetId: 'UxYz789', targetType: 'user', action: '--', scoreDelta: -1 },
    ]);
  });
  it('parses user IDs without spaces before vote', () => {
    expect(parseVote('<@U123abc>++')).toEqual([
      { targetId: 'U123abc', targetType: 'user', action: '++', scoreDelta: 1 },
    ]);
  });
  it('parses user IDs with extra text after vote', () => {
    expect(parseVote('<@U123abc> ++ great job!')).toEqual([
      { targetId: 'U123abc', targetType: 'user', action: '++', scoreDelta: 1 },
    ]);
  });

  it('parses thing votes with sanitization', () => {
    expect(parseVote('@Broncos ++')).toEqual([
      { targetId: 'broncos', targetType: 'thing', action: '++', scoreDelta: 1 },
    ]);
    expect(parseVote('Score for @PwNd ++ ; drop database')).toEqual([
      { targetId: 'pwnd', targetType: 'thing', action: '++', scoreDelta: 1 },
    ]);
  });

  it('parses stronger positive votes as extra points', () => {
    expect(parseVote('@Broncos +++')).toEqual([
      { targetId: 'broncos', targetType: 'thing', action: '++', scoreDelta: 2 },
    ]);
  });

  it('ignores malformed thing votes', () => {
    expect(parseVote('@@invalid ++')).toEqual([]);
    expect(parseVote('email test foo@bar.com ++')).toEqual([]);
  });
});
