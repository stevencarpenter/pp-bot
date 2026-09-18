import { sanitizeThingName, sanitizeUserId } from '../utils/sanitize';

describe('sanitize utilities', () => {
  test('sanitizeUserId trims and validates length', () => {
    expect(sanitizeUserId(' U123 ')).toBe('U123');
    expect(sanitizeUserId('user-with-hyphen')).toBeNull();
    expect(sanitizeUserId('')).toBeNull();
  });

  test('sanitizeThingName lowers case and removes unsafe chars', () => {
    expect(sanitizeThingName('  Broncos!!! ')).toBe('broncos');
    expect(sanitizeThingName('Drop ; table ')).toBe('drop  table');
    expect(sanitizeThingName('Drop; table ')).toBe('drop table');
    expect(sanitizeThingName('')).toBeNull();
  });

  test('preserves whitespace normalization, ASCII allowlists, and length limits', () => {
    expect(sanitizeUserId('\u00a0\ufeffU123\u2028')).toBe('U123');
    expect(sanitizeUserId('U'.repeat(20))).toBe('U'.repeat(20));
    expect(sanitizeUserId('U'.repeat(21))).toBeNull();
    expect(sanitizeUserId('U\u0000123')).toBeNull();
    expect(sanitizeUserId('Ué123')).toBeNull();
    expect(sanitizeThingName('\u00a0Team\t\nRelease\ufeff')).toBe('team release');
    expect(sanitizeThingName("A_B-C.D's <@> & é🎉\u0000")).toBe("a_b-c.d's");
    expect(sanitizeThingName('A'.repeat(65))).toBe('a'.repeat(64));
    expect(sanitizeThingName('é🎉\u0000')).toBeNull();
  });
});
