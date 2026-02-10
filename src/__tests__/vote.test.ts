import { parseVote } from '../utils/vote';

describe('parseVote (TS)', () => {
  it('parses ++', () => {
    expect(parseVote('<@U123> ++')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '++' },
    ]);
  });
  it('parses --', () => {
    expect(parseVote('<@U123> --')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '--' },
    ]);
  });
  it('parses multiple', () => {
    expect(parseVote('<@U1> ++ and <@U2> --')).toEqual([
      { targetId: 'U1', targetType: 'user', action: '++' },
      { targetId: 'U2', targetType: 'user', action: '--' },
    ]);
  });
  it('parses user IDs with lowercase letters', () => {
    expect(parseVote('<@U123abc> ++')).toEqual([
      { targetId: 'U123abc', targetType: 'user', action: '++' },
    ]);
    expect(parseVote('<@UaBcDeF123> --')).toEqual([
      { targetId: 'UaBcDeF123', targetType: 'user', action: '--' },
    ]);
  });
  it('parses mixed case user IDs in multiple votes', () => {
    expect(parseVote('<@U1A2B3c> ++ and <@UxYz789> --')).toEqual([
      { targetId: 'U1A2B3c', targetType: 'user', action: '++' },
      { targetId: 'UxYz789', targetType: 'user', action: '--' },
    ]);
  });
  it('parses user IDs without spaces before vote', () => {
    expect(parseVote('<@U123abc>++')).toEqual([
      { targetId: 'U123abc', targetType: 'user', action: '++' },
    ]);
  });
  it('parses user IDs with extra text after vote', () => {
    expect(parseVote('<@U123abc> ++ great job!')).toEqual([
      { targetId: 'U123abc', targetType: 'user', action: '++' },
    ]);
  });

  it('parses thing votes with sanitization', () => {
    expect(parseVote('@Broncos ++')).toEqual([
      { targetId: 'broncos', targetType: 'thing', action: '++' },
    ]);
    expect(parseVote('Score for @PwNd ++ ; drop database')).toEqual([
      { targetId: 'pwnd', targetType: 'thing', action: '++' },
    ]);
  });

  it('ignores malformed thing votes', () => {
    expect(parseVote('@@invalid ++')).toEqual([]);
    expect(parseVote('email test foo@bar.com ++')).toEqual([]);
  });
});
