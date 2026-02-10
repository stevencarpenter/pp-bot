import { LogLevelName } from './logger';
import { getDatabaseSslConfig, assertSecureDbSslPolicy } from './security/db-ssl';
import { getAbuseControlsConfig } from './security/abuse-controls';

const LOG_LEVELS: LogLevelName[] = ['error', 'warn', 'info', 'debug'];
const NODE_ENVS = ['development', 'production', 'test'] as const;
const PLACEHOLDER_PATTERNS = [
  'your-bot-token',
  'your-app-token',
  'your-signing-secret',
  'replace-me',
  'changeme',
  'placeholder',
];

type NodeEnvName = (typeof NODE_ENVS)[number];

type EnvValidationOptions = {
  requireSlack?: boolean;
};

type ValidatedEnv = {
  logLevel: LogLevelName;
  nodeEnv: NodeEnvName;
};

function isPlaceholderSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function parseIntegerEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  minimum: number,
  errors: string[]
): number | undefined {
  const rawValue = env[name];
  if (!rawValue || rawValue.trim() === '') return undefined;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < minimum) {
    errors.push(`Invalid ${name} "${rawValue}". Expected an integer >= ${minimum}.`);
    return undefined;
  }
  return parsed;
}

export function validateEnv(options: EnvValidationOptions = {}): ValidatedEnv {
  const { requireSlack = true } = options;
  const errors: string[] = [];

  if (requireSlack) {
    const missing = ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_APP_TOKEN'].filter(
      (key) => !process.env[key]
    );
    if (missing.length) {
      errors.push(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const botToken = process.env.SLACK_BOT_TOKEN;
    if (botToken) {
      if (!botToken.startsWith('xoxb-')) {
        errors.push('SLACK_BOT_TOKEN must start with "xoxb-".');
      }
      if (isPlaceholderSecret(botToken)) {
        errors.push('SLACK_BOT_TOKEN appears to be a placeholder value.');
      }
    }

    const appToken = process.env.SLACK_APP_TOKEN;
    if (appToken) {
      if (!appToken.startsWith('xapp-')) {
        errors.push('SLACK_APP_TOKEN must start with "xapp-".');
      }
      if (isPlaceholderSecret(appToken)) {
        errors.push('SLACK_APP_TOKEN appears to be a placeholder value.');
      }
    }

    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (signingSecret && isPlaceholderSecret(signingSecret)) {
      errors.push('SLACK_SIGNING_SECRET appears to be a placeholder value.');
    }
  }

  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  if (!NODE_ENVS.includes(nodeEnv as NodeEnvName)) {
    errors.push(
      `Invalid NODE_ENV "${process.env.NODE_ENV}". Expected one of: ${NODE_ENVS.join(', ')}.`
    );
  }

  const rawLogLevel = process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug');
  const logLevel = rawLogLevel.toLowerCase();
  if (!LOG_LEVELS.includes(logLevel as LogLevelName)) {
    errors.push(
      `Invalid LOG_LEVEL "${process.env.LOG_LEVEL}". Expected one of: ${LOG_LEVELS.join(', ')}.`
    );
  }

  parseIntegerEnv(process.env, 'MAINTENANCE_DEDUPE_RETENTION_DAYS', 1, errors);
  parseIntegerEnv(process.env, 'MAINTENANCE_VOTE_HISTORY_RETENTION_DAYS', 1, errors);

  const hasDatabaseUrl =
    typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim() !== '';
  if (hasDatabaseUrl) {
    try {
      getDatabaseSslConfig();
      assertSecureDbSslPolicy();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  try {
    getAbuseControlsConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);
  }

  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  return {
    logLevel: logLevel as LogLevelName,
    nodeEnv: nodeEnv as NodeEnvName,
  };
}
