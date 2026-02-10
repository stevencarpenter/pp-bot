import { validateEnv } from '../env';

describe('environment security validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function setValidSlackEnv() {
    process.env.SLACK_BOT_TOKEN = 'xoxb-1234567890-valid'; // gitleaks:allow
    process.env.SLACK_APP_TOKEN = 'xapp-1234567890-valid'; // gitleaks:allow
    process.env.SLACK_SIGNING_SECRET = 'super-secret-signing-value'; // gitleaks:allow
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'info';
    process.env.DATABASE_URL = 'pgmem://env-test';
  }

  test('rejects malformed Slack token formats', () => {
    setValidSlackEnv();
    process.env.SLACK_BOT_TOKEN = 'xoxp-invalid'; // gitleaks:allow

    expect(() => validateEnv()).toThrow('SLACK_BOT_TOKEN must start with "xoxb-".');
  });

  test('rejects placeholder secrets', () => {
    setValidSlackEnv();
    process.env.SLACK_APP_TOKEN = 'xapp-your-app-token'; // gitleaks:allow

    expect(() => validateEnv()).toThrow('SLACK_APP_TOKEN appears to be a placeholder value.');
  });

  test('rejects invalid DB SSL mode and maintenance values', () => {
    setValidSlackEnv();
    process.env.DB_SSL_MODE = 'not-valid';
    process.env.MAINTENANCE_DEDUPE_RETENTION_DAYS = '0';

    expect(() => validateEnv()).toThrow('Invalid DB_SSL_MODE');
    try {
      validateEnv();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain('Invalid MAINTENANCE_DEDUPE_RETENTION_DAYS');
    }
  });

  test('accepts valid secure configuration', () => {
    setValidSlackEnv();
    process.env.DB_SSL_MODE = 'verify-full';
    process.env.ABUSE_ENFORCEMENT_MODE = 'enforce';

    const validated = validateEnv();
    expect(validated.nodeEnv).toBe('test');
    expect(validated.logLevel).toBe('info');
  });
});
