import { LogLevel } from '@slack/bolt';
import { BOLT_LOGGER_NAME, createBoltLogger } from '../bolt-logger';

describe('Bolt logger adapter', () => {
  const originalEnv = { ...process.env };
  const originalConsole = { ...console };
  let stderrLines: string[];
  let stdoutLines: string[];

  beforeEach(() => {
    stderrLines = [];
    stdoutLines = [];
    console.error = (...args: unknown[]) => stderrLines.push(args.join(' '));
    console.warn = (...args: unknown[]) => stderrLines.push(args.join(' '));
    console.info = (...args: unknown[]) => stdoutLines.push(args.join(' '));
    console.log = (...args: unknown[]) => stdoutLines.push(args.join(' '));
    process.env.LOG_FORMAT = 'json';
    process.env.LOG_LEVEL = 'debug';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    Object.assign(console, originalConsole);
  });

  test('writes the Socket Mode pong timeout as a warn record named bolt-app', () => {
    const boltLogger = createBoltLogger(LogLevel.INFO);

    boltLogger.warn("A pong wasn't received from the server before the timeout of 5000ms!");

    expect(stdoutLines).toHaveLength(0);
    expect(stderrLines).toHaveLength(1);
    expect(JSON.parse(stderrLines[0])).toMatchObject({
      level: 'warn',
      logger: BOLT_LOGGER_NAME,
      message: "A pong wasn't received from the server before the timeout of 5000ms!",
    });
  });

  test('honors setLevel and getLevel', () => {
    const boltLogger = createBoltLogger(LogLevel.INFO);

    boltLogger.debug('hidden at info');
    expect(stdoutLines).toHaveLength(0);

    boltLogger.setLevel(LogLevel.DEBUG);
    expect(boltLogger.getLevel()).toBe(LogLevel.DEBUG);
    boltLogger.debug('shown at debug');
    expect(JSON.parse(stdoutLines[0])).toMatchObject({ level: 'debug', message: 'shown at debug' });

    boltLogger.setLevel(LogLevel.ERROR);
    boltLogger.warn('hidden at error');
    boltLogger.error('shown at error');
    expect(stderrLines.map((line) => JSON.parse(line).message)).toEqual(['shown at error']);
  });

  test('setName changes the logger attribute', () => {
    const boltLogger = createBoltLogger();
    boltLogger.setName('socket-mode');
    boltLogger.info('connected');
    expect(JSON.parse(stdoutLines[0])).toMatchObject({ logger: 'socket-mode', level: 'info' });
  });

  test('text format keeps the bolt-app prefix', () => {
    process.env.LOG_FORMAT = 'text';
    const boltLogger = createBoltLogger();
    boltLogger.warn('plain warning');
    expect(stderrLines[0]).toContain('[WARN] bolt-app plain warning');
  });
});
