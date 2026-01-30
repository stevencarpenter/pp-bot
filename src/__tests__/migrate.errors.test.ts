/**
 * Tests for migrate.ts error handling paths
 */

describe('migration script error handling', () => {
  const originalEnv = { ...process.env };
  const originalExit = process.exit;
  const originalConsoleError = console.error;
  let exitCode: number | undefined;

  beforeEach(() => {
    exitCode = undefined;
    // Mock process.exit to capture the exit code
    process.exit = jest.fn((code?: number) => {
      exitCode = code as number;
      throw new Error('process.exit called');
    }) as never;
    // Suppress console.error during error path tests
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.exit = originalExit;
    process.exitCode = undefined;
    console.error = originalConsoleError;
  });

  test('should error when DATABASE_URL is not set', async () => {
    // Remove DATABASE_URL
    delete process.env.DATABASE_URL;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const migrate = require('../scripts/migrate').default;

    try {
      await migrate();
    } catch (e: unknown) {
      // Expect the process.exit mock to throw
      expect((e as Error).message).toBe('process.exit called');
    }

    // Verify process.exit was called with error code
    expect(exitCode).toBe(1);
  });

  test('should handle rollback on migration failure', async () => {
    // Set up test environment with DATABASE_URL
    process.env.DATABASE_URL = 'pgmem://test-error';

    // Import migrate function
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const migrate = require('../scripts/migrate').default;

    // Create a mock pool that will fail on DDL query
    const mockPool = {
      query: jest.fn().mockImplementation((sql: string) => {
        if (sql === 'BEGIN') {
          return Promise.resolve();
        } else if (sql === 'ROLLBACK') {
          return Promise.resolve();
        }
        // Fail on the DDL query
        return Promise.reject(new Error('Mock DDL error'));
      }),
    };

    await migrate(mockPool);

    // Verify ROLLBACK was called
    expect(mockPool.query).toHaveBeenCalledWith('ROLLBACK');
    expect(process.exitCode).toBe(1);
  });
});
