import logger from '../logger';

describe('logger redaction', () => {
  const originalEnv = { ...process.env };
  const originalConsole: any = { ...console };

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.assign(console, originalConsole);
  });

  test('redacts slack tokens and database credentials in strings and objects', () => {
    process.env.LOG_LEVEL = 'error';

    const capturedCalls: any[][] = [];
    // @ts-ignore
    console.error = (...args: any[]) => capturedCalls.push(args);

    const payload: any = {
      token: 'xoxb-secret-token',
      db: 'postgres://user:pass123@localhost:5432/db',
    };
    payload.self = payload;

    logger.error('token xapp-very-secret and db postgres://u:p@host/db', payload);

    const output = capturedCalls.map((call) => call.join(' ')).join('\n');
    const objectArg = capturedCalls[0]?.[2] as Record<string, unknown>;
    expect(output).toContain('[REDACTED_SLACK_TOKEN]');
    expect(output).toContain('[REDACTED]@');
    expect(output).not.toContain('pass123');
    expect(objectArg.self).toBe('[Circular]');
  });
});
