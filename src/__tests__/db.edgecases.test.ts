/**
 * Tests for db.ts edge cases
 */

describe('db module edge cases', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    // Clear module cache
    jest.resetModules();
  });

  test('should warn when DATABASE_URL is not set', () => {
    // Clear DATABASE_URL
    delete process.env.DATABASE_URL;
    process.env.LOG_LEVEL = 'info';

    // Spy on console.warn before importing
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Re-import db module to trigger the warning
    jest.isolateModules(() => {
      require('../db');
    });

    // Verify warning was logged - logger calls console.warn with timestamp and message
    expect(warnSpy).toHaveBeenCalled();
    const callArgs = warnSpy.mock.calls[0];
    const fullMessage = callArgs.join(' ');
    expect(fullMessage).toContain('DATABASE_URL not set');

    warnSpy.mockRestore();
  });
});
