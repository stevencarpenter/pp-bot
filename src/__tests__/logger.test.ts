import logger from '../logger';

describe('logger levels', () => {
  let originalLevel: string | undefined;
  let outputs: string[];
  const origConsole = { ...console } as any;

  beforeEach(() => {
    originalLevel = process.env.LOG_LEVEL;
    outputs = [];
    // @ts-ignore
    console.error =
      console.warn =
      console.info =
      console.log =
        (...args: any[]) => {
          outputs.push(args.join(' '));
        };
  });
  afterEach(() => {
    process.env.LOG_LEVEL = originalLevel;
    Object.assign(console, origConsole);
  });

  test('warn level suppresses debug & info but logs warn/error', () => {
    process.env.LOG_LEVEL = 'warn';
    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');
    const joined = outputs.join('\n');
    expect(joined).toContain('warn msg');
    expect(joined).toContain('error msg');
    expect(joined).not.toContain('info msg');
    expect(joined).not.toContain('debug msg');
  });
});
