const levels = ['error', 'warn', 'info', 'debug'] as const;
export type LogLevelName = (typeof levels)[number];
const SLACK_TOKEN_PATTERNS = [/\bxox[baprs]-[A-Za-z0-9-]+\b/g, /\bxapp-[A-Za-z0-9-]+\b/g];
const DATABASE_URL_CREDENTIAL_PATTERN = /\b(postgres(?:ql)?:\/\/[^:\s]+:)([^@\s]+)@/gi;

function redactString(value: string): string {
  let sanitized = value;
  for (const pattern of SLACK_TOKEN_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SLACK_TOKEN]');
  }
  sanitized = sanitized.replace(DATABASE_URL_CREDENTIAL_PATTERN, '$1[REDACTED]@');
  return sanitized;
}

function redactValue(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return `<Buffer length=${value.length}>`;
  }
  if (value instanceof Error) {
    const cloned = new Error(redactString(value.message));
    cloned.name = value.name;
    if (value.stack) {
      cloned.stack = redactString(value.stack);
    }
    return cloned;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    return value.map((item) => redactValue(item, seen));
  }
  if (value instanceof Set) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    return Array.from(value, (item) => redactValue(item, seen));
  }
  if (value instanceof Map) {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    return Array.from(value.entries(), ([key, nestedValue]) => [
      redactValue(key, seen),
      redactValue(nestedValue, seen),
    ]);
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }
    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      result[key] = redactValue(nestedValue, seen);
    }
    return result;
  }
  return value;
}

function resolveCurrentLevel(): LogLevelName {
  const env = (
    process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  ).toLowerCase();
  return (levels.includes(env as LogLevelName) ? env : 'info') as LogLevelName;
}

function logAt(level: LogLevelName, args: unknown[]) {
  const current = resolveCurrentLevel();
  const currentIdx = levels.indexOf(current);
  const idx = levels.indexOf(level);
  if (idx <= currentIdx) {
    const ts = new Date().toISOString();
    const redactedArgs = args.map((arg) => redactValue(arg));
    const consoleMethod: 'error' | 'warn' | 'info' | 'log' = level === 'debug' ? 'log' : level;
    // eslint-disable-next-line no-console
    console[consoleMethod](`[${ts}] [${level.toUpperCase()}]`, ...redactedArgs);
  }
}

export const logger = {
  error: (...a: unknown[]) => logAt('error', a),
  warn: (...a: unknown[]) => logAt('warn', a),
  info: (...a: unknown[]) => logAt('info', a),
  debug: (...a: unknown[]) => logAt('debug', a),
};

export default logger;
