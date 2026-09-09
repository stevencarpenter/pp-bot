const MAX_THING_LENGTH = 64;

export function sanitizeUserId(userId: string): string | null {
  const trimmed = userId.trim();
  return /^[A-Za-z0-9]{1,20}$/.test(trimmed) ? trimmed : null;
}

export function sanitizeThingName(name: string): string | null {
  const sanitized = name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9 _\-.']+/g, '')
    .trim();
  return sanitized ? sanitized.slice(0, MAX_THING_LENGTH).toLowerCase() : null;
}
