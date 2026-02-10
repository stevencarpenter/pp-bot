import logger from '../logger';

describe('logger redaction', () => {
  const originalEnv = { ...process.env };
  const originalConsole = { ...console };

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.assign(console, originalConsole);
  });

  test('redacts slack tokens and database credentials in strings and objects', () => {
    process.env.LOG_LEVEL = 'error';

    const capturedCalls: unknown[][] = [];
    console.error = (...args: unknown[]) => capturedCalls.push(args);

    const payload: Record<string, unknown> = {
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

  test('preserves useful shape for common built-in object types', () => {
    process.env.LOG_LEVEL = 'error';

    const capturedCalls: unknown[][] = [];
    console.error = (...args: unknown[]) => capturedCalls.push(args);

    const payload = {
      createdAt: new Date('2026-02-10T00:00:00.000Z'),
      tags: new Set(['alpha', 'beta']),
      metadata: new Map([
        ['token', 'xoxb-map-secret'],
        ['db', 'postgres://u:p@host/db'],
      ]),
      body: Buffer.from('hello', 'utf8'),
    };

    logger.error('built-in payload', payload);

    const objectArg = capturedCalls[0]?.[2] as Record<string, unknown>;
    expect(objectArg.createdAt).toBe('2026-02-10T00:00:00.000Z');
    expect(objectArg.tags).toEqual(['alpha', 'beta']);
    expect(objectArg.body).toBe('<Buffer length=5>');

    const metadata = objectArg.metadata as [unknown, unknown][];
    expect(metadata[0][1]).toBe('[REDACTED_SLACK_TOKEN]');
    expect(metadata[1][1]).toContain('[REDACTED]@');
  });

  test('handles self-referential arrays without recursion overflow', () => {
    process.env.LOG_LEVEL = 'error';

    const capturedCalls: unknown[][] = [];
    console.error = (...args: unknown[]) => capturedCalls.push(args);

    const circularArray: unknown[] = ['safe'];
    circularArray.push(circularArray);

    logger.error('circular array payload', circularArray);

    const payloadArg = capturedCalls[0]?.[2] as unknown[];
    expect(Array.isArray(payloadArg)).toBe(true);
    expect(payloadArg[0]).toBe('safe');
    expect(payloadArg[1]).toBe('[Circular]');
  });
});
