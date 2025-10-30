import {sanitizeThingName, sanitizeUserId} from '../utils/sanitize';

describe('sanitize utilities', () => {
    test('sanitizeUserId trims and validates length', () => {
        expect(sanitizeUserId(' U123 ')).toBe('U123');
        expect(sanitizeUserId('user-with-hyphen')).toBeNull();
        expect(sanitizeUserId('')).toBeNull();
    });

    test('sanitizeThingName lowers case and removes unsafe chars', () => {
        expect(sanitizeThingName('  Broncos!!! ')).toBe('broncos');
        expect(sanitizeThingName('Drop ; table ')).toBe('drop table');
        expect(sanitizeThingName('')).toBeNull();
    });
});
