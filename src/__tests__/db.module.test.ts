/**
 * Tests for db.ts module side effects & event handlers (single import to avoid extra pools)
 */

describe('db module behavior', () => {
  const originalEnv = { ...process.env };
  let originalConsole: any;
  let outputs: { warn: string[]; error: string[]; info: string[] };

  beforeAll(() => {
    // Ensure a DATABASE_URL so pool initializes predictably
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'pgmem://db-module';
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'info';
  });

  beforeEach(() => {
    outputs = { warn: [], error: [], info: [] };
    originalConsole = { ...console } as any;
    // @ts-ignore
    console.warn = (...a: any[]) => outputs.warn.push(a.join(' '));
    // @ts-ignore
    console.error = (...a: any[]) => outputs.error.push(a.join(' '));
    // @ts-ignore
    console.info = (...a: any[]) => outputs.info.push(a.join(' '));
  });

  afterEach(() => {
    Object.assign(console, originalConsole);
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  test('emits connect/info & error handler works', () => {
    const { pool } = require('../db');
    if (typeof pool.emit === 'function') {
      pool.emit('connect');
      pool.emit('error', new Error('boom'));
    }
    expect(outputs.info.join('\n')).toMatch(/Database connection established/);
    expect(outputs.error.join('\n')).toMatch(/boom/);
  });
});
