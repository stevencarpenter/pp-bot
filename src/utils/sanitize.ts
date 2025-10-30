import validator from 'validator';

const USER_ID_WHITELIST = 'A-Za-z0-9';
const THING_WHITELIST = "A-Za-z0-9 _\\-.'";
const MAX_THING_LENGTH = 64;

export function sanitizeUserId(userId: string): string | null {
  if (typeof userId !== 'string') return null;
  const trimmed = validator.trim(userId);
  if (!trimmed) return null;
  const sanitized = validator.whitelist(trimmed, USER_ID_WHITELIST);
  if (sanitized !== trimmed) {
    return null;
  }
  if (!validator.isLength(sanitized, { min: 1, max: 20 })) {
    return null;
  }
  return sanitized;
}

export function sanitizeThingName(name: string): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = validator.trim(name);
  if (!trimmed) return null;
  const normalizedWhitespace = trimmed.replace(/\s+/g, ' ');
  const sanitized = validator.whitelist(normalizedWhitespace, THING_WHITELIST);
  const collapsed = sanitized.replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  const limited = collapsed.slice(0, MAX_THING_LENGTH);
  return limited.toLowerCase();
}
