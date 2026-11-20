import { LogLevel, type Logger } from '@slack/bolt';
import { createNamedLogger, isLevelEnabled, type LogLevelName } from './logger';

/** Name Bolt's own ConsoleLogger uses, kept so existing log searches still match. */
export const BOLT_LOGGER_NAME = 'bolt-app';

const LEVEL_NAME_BY_BOLT_LEVEL: Record<LogLevel, LogLevelName> = {
  [LogLevel.ERROR]: 'error',
  [LogLevel.WARN]: 'warn',
  [LogLevel.INFO]: 'info',
  [LogLevel.DEBUG]: 'debug',
};

/**
 * Sends Bolt's logs (and the Socket Mode client's, which shares this logger) through the app
 * logger, so they get the same redaction, stream routing and JSON format as the rest of pp-bot.
 * Without this, Bolt's ConsoleLogger writes plain text and Railway tags its warnings, such as
 * Socket Mode's "A pong wasn't received" reconnect notice, as errors.
 */
export function createBoltLogger(initialLevel: LogLevel = LogLevel.INFO): Logger {
  let currentLevel = initialLevel;
  let appLogger = createNamedLogger(BOLT_LOGGER_NAME);

  const writeIfEnabled = (level: LogLevelName, messages: unknown[]) => {
    if (isLevelEnabled(level, LEVEL_NAME_BY_BOLT_LEVEL[currentLevel])) {
      appLogger[level](...messages);
    }
  };

  return {
    error: (...messages: unknown[]) => writeIfEnabled('error', messages),
    warn: (...messages: unknown[]) => writeIfEnabled('warn', messages),
    info: (...messages: unknown[]) => writeIfEnabled('info', messages),
    debug: (...messages: unknown[]) => writeIfEnabled('debug', messages),
    setLevel: (level: LogLevel) => {
      currentLevel = level;
    },
    getLevel: () => currentLevel,
    setName: (name: string) => {
      appLogger = createNamedLogger(name);
    },
  };
}
