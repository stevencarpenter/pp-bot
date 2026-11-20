/**
 * Application logger.
 *
 * Stream routing (the Node console contract):
 *   error, warn -> stderr  (console.error / console.warn)
 *   info, debug -> stdout  (console.info / console.log)
 *
 * Output formats (LOG_FORMAT):
 *   text - `[timestamp] [LEVEL] message ...` for reading in a terminal.
 *   json - one JSON object per line with `timestamp`, `level` and `message`. Railway reads the
 *          `level` field as the log's severity, so a warning shows as a warning instead of being
 *          tagged as an error just because it was written to stderr. Keeping each record on one
 *          line also stops multi-line objects from being split into separate log entries.
 *
 * LOG_FORMAT defaults to `json` when NODE_ENV=production and `text` otherwise, the same way
 * LOG_LEVEL defaults by NODE_ENV.
 */

const levels = ['error', 'warn', 'info', 'debug'] as const;
export type LogLevelName = (typeof levels)[number];

const logFormats = ['text', 'json'] as const;
export type LogFormatName = (typeof logFormats)[number];
export const LOG_FORMATS: readonly LogFormatName[] = logFormats;

type ConsoleMethodName = 'error' | 'warn' | 'info' | 'log';

const CONSOLE_METHOD_BY_LEVEL: Record<LogLevelName, ConsoleMethodName> = {
  error: 'error', // stderr
  warn: 'warn', // stderr
  info: 'info', // stdout
  debug: 'log', // stdout
};

/** Keys every JSON record owns. Caller attributes with these names are kept under `context_<key>`. */
const RESERVED_RECORD_KEYS = new Set(['timestamp', 'level', 'message', 'logger', 'error']);
const RESERVED_KEY_PREFIX = 'context_';

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

export function resolveLogFormat(): LogFormatName {
  const environmentDefault: LogFormatName = process.env.NODE_ENV === 'production' ? 'json' : 'text';
  const requested = (process.env.LOG_FORMAT || environmentDefault).toLowerCase();
  return logFormats.includes(requested as LogFormatName)
    ? (requested as LogFormatName)
    : environmentDefault;
}

/** True when a message at `level` should be written while the threshold is `threshold`. */
export function isLevelEnabled(level: LogLevelName, threshold: LogLevelName): boolean {
  return levels.indexOf(level) <= levels.indexOf(threshold);
}

type SerializedError = { name: string; message: string; stack?: string };

function serializeError(error: Error): SerializedError {
  return { name: error.name, message: error.message, stack: error.stack };
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Error) {
    return serializeError(value);
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Error)
  );
}

/**
 * Builds one JSON record from already-redacted logger arguments:
 *   - strings and other primitives are joined with spaces into `message`
 *   - the first Error becomes `error` ({ name, message, stack }); later ones are added to `message`
 *   - plain objects are merged in as top-level attributes (queryable in Railway as @key:value)
 *   - anything else (arrays, for example) is added to `message` as JSON
 */
export function buildJsonRecord(
  level: LogLevelName,
  redactedArgs: unknown[],
  loggerName?: string,
  timestamp: string = new Date().toISOString()
): Record<string, unknown> {
  const messageParts: string[] = [];
  const attributes: Record<string, unknown> = {};
  let firstError: SerializedError | undefined;

  for (const arg of redactedArgs) {
    if (arg instanceof Error) {
      if (firstError) {
        messageParts.push(`${arg.name}: ${arg.message}`);
      } else {
        firstError = serializeError(arg);
      }
    } else if (isPlainObject(arg)) {
      for (const [key, value] of Object.entries(arg)) {
        const attributeKey = RESERVED_RECORD_KEYS.has(key) ? `${RESERVED_KEY_PREFIX}${key}` : key;
        attributes[attributeKey] = value;
      }
    } else if (typeof arg === 'object' && arg !== null) {
      messageParts.push(JSON.stringify(arg, jsonReplacer));
    } else {
      messageParts.push(String(arg));
    }
  }

  const message = messageParts.join(' ') || firstError?.message || '';

  return {
    timestamp,
    level,
    message,
    ...(loggerName ? { logger: loggerName } : {}),
    ...(firstError ? { error: firstError } : {}),
    ...attributes,
  };
}

function logAt(level: LogLevelName, args: unknown[], loggerName?: string) {
  if (!isLevelEnabled(level, resolveCurrentLevel())) {
    return;
  }
  const timestamp = new Date().toISOString();
  const redactedArgs = args.map((arg) => redactValue(arg));
  const consoleMethod = CONSOLE_METHOD_BY_LEVEL[level];

  if (resolveLogFormat() === 'json') {
    const record = buildJsonRecord(level, redactedArgs, loggerName, timestamp);
    // eslint-disable-next-line no-console
    console[consoleMethod](JSON.stringify(record, jsonReplacer));
    return;
  }

  const textPrefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const textArgs = loggerName ? [loggerName, ...redactedArgs] : redactedArgs;
  // eslint-disable-next-line no-console
  console[consoleMethod](textPrefix, ...textArgs);
}

export type AppLogger = Record<LogLevelName, (...args: unknown[]) => void>;

/** A logger whose records carry `logger: <name>`, for output that comes from a library. */
export function createNamedLogger(loggerName: string): AppLogger {
  return {
    error: (...a: unknown[]) => logAt('error', a, loggerName),
    warn: (...a: unknown[]) => logAt('warn', a, loggerName),
    info: (...a: unknown[]) => logAt('info', a, loggerName),
    debug: (...a: unknown[]) => logAt('debug', a, loggerName),
  };
}

export const logger: AppLogger = {
  error: (...a: unknown[]) => logAt('error', a),
  warn: (...a: unknown[]) => logAt('warn', a),
  info: (...a: unknown[]) => logAt('info', a),
  debug: (...a: unknown[]) => logAt('debug', a),
};

export default logger;
