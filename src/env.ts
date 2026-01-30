import { LogLevelName } from './logger';

const LOG_LEVELS: LogLevelName[] = ['error', 'warn', 'info', 'debug'];
const NODE_ENVS = ['development', 'production', 'test'] as const;

type NodeEnvName = (typeof NODE_ENVS)[number];

type EnvValidationOptions = {
  requireSlack?: boolean;
};

type ValidatedEnv = {
  logLevel: LogLevelName;
  nodeEnv: NodeEnvName;
};

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

  if (errors.length) {
    throw new Error(errors.join(' '));
  }

  return {
    logLevel: logLevel as LogLevelName,
    nodeEnv: nodeEnv as NodeEnvName,
  };
}
