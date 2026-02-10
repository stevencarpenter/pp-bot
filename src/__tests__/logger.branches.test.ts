import { logger } from '../logger';

describe('logger branch coverage', () => {
  const origEnv = { ...process.env };
  let captured: string[];
  const origConsole: any = { ...console } as any;

  function hook() {
    captured = [];
    // @ts-ignore
    console.info = (...a: any[]) => captured.push(a.join(' '));
    // @ts-ignore
    console.log = (...a: any[]) => captured.push(a.join(' '));
    // @ts-ignore
    console.warn = (...a: any[]) => captured.push(a.join(' '));
    // @ts-ignore
    console.error = (...a: any[]) => captured.push(a.join(' '));
  }

  afterEach(() => {
    Object.assign(process.env, origEnv);
    Object.assign(console, origConsole);
  });

  test('invalid LOG_LEVEL falls back to INFO (suppresses debug)', () => {
    process.env.LOG_LEVEL = 'not-a-level';
    process.env.NODE_ENV = 'development';
    hook();
    logger.debug('debug msg');
    logger.info('info msg');
    expect(captured.join('\n')).toContain('info msg');
    expect(captured.join('\n')).not.toContain('debug msg');
  });

  test('production default picks INFO (no explicit LOG_LEVEL)', () => {
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = 'production';
    hook();
    logger.debug('debug msg');
    logger.info('info msg');
    expect(captured.join('\n')).toContain('info msg');
    expect(captured.join('\n')).not.toContain('debug msg');
  });
});
