import { parseVote } from '../utils/vote';

describe('parseVote (TS)', () => {
  it('parses ++', () => {
    expect(parseVote('<@U123> ++')).toEqual([{ userId: 'U123', action: '++' }]);
  });
  it('parses --', () => {
    expect(parseVote('<@U123> --')).toEqual([{ userId: 'U123', action: '--' }]);
  });
  it('parses multiple', () => {
    expect(parseVote('<@U1> ++ and <@U2> --')).toEqual([
      { userId: 'U1', action: '++' },
      { userId: 'U2', action: '--' },
    ]);
  });
  it('parses user IDs with lowercase letters', () => {
    expect(parseVote('<@U123abc> ++')).toEqual([{ userId: 'U123abc', action: '++' }]);
    expect(parseVote('<@UaBcDeF123> --')).toEqual([{ userId: 'UaBcDeF123', action: '--' }]);
  });
  it('parses mixed case user IDs in multiple votes', () => {
    expect(parseVote('<@U1A2B3c> ++ and <@UxYz789> --')).toEqual([
      { userId: 'U1A2B3c', action: '++' },
      { userId: 'UxYz789', action: '--' },
    ]);
  });
  it('parses user IDs without spaces before vote', () => {
    expect(parseVote('<@U123abc>++')).toEqual([{ userId: 'U123abc', action: '++' }]);
  });
  it('parses user IDs with extra text after vote', () => {
    expect(parseVote('<@U123abc> ++ great job!')).toEqual([{ userId: 'U123abc', action: '++' }]);
  });
});
