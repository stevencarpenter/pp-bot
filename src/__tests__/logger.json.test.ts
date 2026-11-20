import { buildJsonRecord, logger, resolveLogFormat } from '../logger';

type CapturedLine = { stream: 'stdout' | 'stderr'; text: string };

describe('logger JSON format and stream routing', () => {
  const originalEnv = { ...process.env };
  const originalConsole = { ...console };
  let capturedLines: CapturedLine[];

  beforeEach(() => {
    capturedLines = [];
    console.error = (...args: unknown[]) =>
      capturedLines.push({ stream: 'stderr', text: args.join(' ') });
    console.warn = (...args: unknown[]) =>
      capturedLines.push({ stream: 'stderr', text: args.join(' ') });
    console.info = (...args: unknown[]) =>
      capturedLines.push({ stream: 'stdout', text: args.join(' ') });
    console.log = (...args: unknown[]) =>
      capturedLines.push({ stream: 'stdout', text: args.join(' ') });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.assign(console, originalConsole);
  });

  test('defaults to json in production and text elsewhere', () => {
    delete process.env.LOG_FORMAT;
    process.env.NODE_ENV = 'production';
    expect(resolveLogFormat()).toBe('json');
    process.env.NODE_ENV = 'development';
    expect(resolveLogFormat()).toBe('text');
  });

  test('explicit LOG_FORMAT wins and an invalid value falls back to the default', () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_FORMAT = 'JSON';
    expect(resolveLogFormat()).toBe('json');
    process.env.LOG_FORMAT = 'not-a-format';
    expect(resolveLogFormat()).toBe('text');
  });

  test('routes warn and error to stderr, info and debug to stdout, one JSON line each', () => {
    process.env.LOG_FORMAT = 'json';
    process.env.LOG_LEVEL = 'debug';

    logger.error('error message');
    logger.warn('warn message');
    logger.info('info message');
    logger.debug('debug message');

    const records = capturedLines.map((line) => ({
      stream: line.stream,
      record: JSON.parse(line.text) as Record<string, unknown>,
    }));
    expect(records.map(({ stream, record }) => [record.level, stream])).toEqual([
      ['error', 'stderr'],
      ['warn', 'stderr'],
      ['info', 'stdout'],
      ['debug', 'stdout'],
    ]);
    expect(records[1].record.message).toBe('warn message');
    expect(capturedLines.every((line) => !line.text.includes('\n'))).toBe(true);
  });

  test('keeps an object argument on the same line as top-level attributes', () => {
    process.env.LOG_FORMAT = 'json';
    process.env.LOG_LEVEL = 'info';

    logger.info('Maintenance cleanup complete', { dedupeDeleted: 3, voteHistoryDeleted: 0 });

    expect(capturedLines).toHaveLength(1);
    const record = JSON.parse(capturedLines[0].text);
    expect(record).toMatchObject({
      level: 'info',
      message: 'Maintenance cleanup complete',
      dedupeDeleted: 3,
      voteHistoryDeleted: 0,
    });
  });

  test('redacts secrets in JSON output', () => {
    process.env.LOG_FORMAT = 'json';
    process.env.LOG_LEVEL = 'error';

    logger.error('failed with xoxb-secret-token', { url: 'postgres://user:pass123@host/db' });

    const output = capturedLines[0].text;
    expect(output).toContain('[REDACTED_SLACK_TOKEN]');
    expect(output).not.toContain('pass123');
  });
});

describe('buildJsonRecord', () => {
  const fixedTimestamp = '2026-11-20T00:00:00.000Z';

  test('puts the first error under error and later ones in the message', () => {
    const firstError = new TypeError('first failure');
    const secondError = new Error('second failure');

    const record = buildJsonRecord(
      'error',
      ['Failed to start app:', firstError, secondError],
      undefined,
      fixedTimestamp
    );

    expect(record.message).toBe('Failed to start app: Error: second failure');
    expect(record.error).toMatchObject({ name: 'TypeError', message: 'first failure' });
  });

  test('uses the error message when there is no text', () => {
    const record = buildJsonRecord(
      'error',
      [new Error('only an error')],
      'bolt-app',
      fixedTimestamp
    );
    expect(record).toMatchObject({ message: 'only an error', logger: 'bolt-app' });
  });

  test('keeps caller attributes that collide with record fields under context_', () => {
    const record = buildJsonRecord(
      'info',
      ['hello', { level: 'custom', message: 'custom message', target: 'U123' }],
      undefined,
      fixedTimestamp
    );

    expect(record).toMatchObject({
      timestamp: fixedTimestamp,
      level: 'info',
      message: 'hello',
      context_level: 'custom',
      context_message: 'custom message',
      target: 'U123',
    });
  });

  test('serializes arrays into the message and survives bigint values', () => {
    const record = buildJsonRecord('info', ['ids', ['a', 'b']], undefined, fixedTimestamp);
    expect(record.message).toBe('ids ["a","b"]');
    expect(() =>
      JSON.stringify(buildJsonRecord('info', ['count', { total: BigInt(5) }]), (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    ).not.toThrow();
  });
});
