const levels = ['error', 'warn', 'info', 'debug'] as const;
export type LogLevelName = typeof levels[number];
const current = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
const currentIdx = levels.indexOf(current as LogLevelName) === -1 ? 2 : levels.indexOf(current as LogLevelName);

function logAt(level: LogLevelName, args: unknown[]) {
  const idx = levels.indexOf(level);
  if (idx <= currentIdx) {
    const ts = new Date().toISOString();
    // eslint-disable-next-line no-console
    (console as any)[level === 'debug' ? 'log' : level](`[${ts}] [${level.toUpperCase()}]`, ...args);
  }
}

export const logger = {
  error: (...a: unknown[]) => logAt('error', a),
  warn: (...a: unknown[]) => logAt('warn', a),
  info: (...a: unknown[]) => logAt('info', a),
  debug: (...a: unknown[]) => logAt('debug', a),
};

export default logger;

