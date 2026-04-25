import { parseVote } from '../utils/vote';

describe('parseVote (TS)', () => {
  let originalMaxVoteScoreDelta: string | undefined;

  beforeEach(() => {
    originalMaxVoteScoreDelta = process.env.MAX_VOTE_SCORE_DELTA;
  });

  afterEach(() => {
    if (originalMaxVoteScoreDelta === undefined) {
      delete process.env.MAX_VOTE_SCORE_DELTA;
      return;
    }

    process.env.MAX_VOTE_SCORE_DELTA = originalMaxVoteScoreDelta;
  });

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

  it('uses the default cap when MAX_VOTE_SCORE_DELTA is unset', () => {
    delete process.env.MAX_VOTE_SCORE_DELTA;

    expect(parseVote('<@U123> ++++++++')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '++', scoreDelta: 5 },
    ]);
  });

  it('caps stronger votes below, at, and above the configured max delta', () => {
    process.env.MAX_VOTE_SCORE_DELTA = '5';

    expect(parseVote('<@U123> +++++')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '++', scoreDelta: 4 },
    ]);
    expect(parseVote('<@U123> ++++++')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '++', scoreDelta: 5 },
    ]);
    expect(parseVote('<@U123> ++++++++')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '++', scoreDelta: 5 },
    ]);
  });

  it('parses stronger negative votes as extra deductions', () => {
    expect(parseVote('<@U123> ---')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '--', scoreDelta: -2 },
    ]);
    expect(parseVote('@release ----')).toEqual([
      { targetId: 'release', targetType: 'thing', action: '--', scoreDelta: -3 },
    ]);
  });

  it('caps stronger downvotes at the configured max delta', () => {
    process.env.MAX_VOTE_SCORE_DELTA = '5';

    expect(parseVote('<@U123> --------')).toEqual([
      { targetId: 'U123', targetType: 'user', action: '--', scoreDelta: -5 },
    ]);
  });

  it('correctly parses thing names that end with a dash', () => {
    expect(parseVote('@my-thing- ---')).toEqual([
      { targetId: 'my-thing-', targetType: 'thing', action: '--', scoreDelta: -2 },
    ]);
  });

  it('ignores malformed thing votes', () => {
    expect(parseVote('@@invalid ++')).toEqual([]);
    expect(parseVote('email test foo@bar.com ++')).toEqual([]);
  });
});
