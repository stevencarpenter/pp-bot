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
      { userId: 'U2', action: '--' }
    ]);
  });
});

