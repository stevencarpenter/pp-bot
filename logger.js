// Simple logger with level control via LOG_LEVEL env var
const levels = ['error', 'warn', 'info', 'debug'];
const current = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const currentIdx = levels.indexOf(current) === -1 ? 2 : levels.indexOf(current);

function logAt(level, args) {
  const idx = levels.indexOf(level);
  if (idx <= currentIdx) {
    const ts = new Date().toISOString();
    console[level === 'debug' ? 'log' : level](`[${ts}] [${level.toUpperCase()}]`, ...args);
  }
}

module.exports = {
  error: (...a) => logAt('error', a),
  warn: (...a) => logAt('warn', a),
  info: (...a) => logAt('info', a),
  debug: (...a) => logAt('debug', a),
};

