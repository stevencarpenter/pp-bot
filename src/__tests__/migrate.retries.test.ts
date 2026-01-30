/**
 * Tests for migrate.ts connection retry logic
 */

jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('migration connection retries', () => {
  const originalEnv = { ...process.env };
  const originalExit = process.exit;

  beforeEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.clearAllMocks();
    process.exit = originalExit;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    process.exit = originalExit;
  });

  test('retries with fresh clients and succeeds', async () => {
    process.env.DATABASE_URL = 'postgres://example';

    const instances: Array<{
      connect: jest.Mock;
      query: jest.Mock;
      end: jest.Mock;
    }> = [];
    let connectAttempts = 0;

    class MockClient {
      connect = jest.fn(() => {
        connectAttempts += 1;
        if (connectAttempts < 3) {
          return Promise.reject(new Error('not ready'));
        }
        return Promise.resolve();
      });
      query = jest.fn().mockResolvedValue({});
      end = jest.fn().mockResolvedValue(undefined);
      constructor() {
        instances.push(this);
      }
    }

    jest.doMock('pg', () => ({
      Client: MockClient,
      Pool: jest.fn(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const migrate = require('../scripts/migrate').default;
    const result = await migrate();

    expect(result).toBe(true);
    expect(instances).toHaveLength(3);
    expect(instances[0].connect).toHaveBeenCalledTimes(1);
    expect(instances[1].connect).toHaveBeenCalledTimes(1);
    expect(instances[2].connect).toHaveBeenCalledTimes(1);
    expect(instances[0].end).toHaveBeenCalledTimes(1);
    expect(instances[1].end).toHaveBeenCalledTimes(1);
    expect(instances[2].end).toHaveBeenCalledTimes(1);
    expect(instances[2].query).toHaveBeenCalledWith('BEGIN');
    expect(instances[2].query).toHaveBeenCalledWith('COMMIT');
  });

  test('respects custom retry config and exits without running DDL', async () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    try {
      process.env.DATABASE_URL = 'postgres://example';
      process.exit = jest.fn() as never;

      const instances: Array<{
        connect: jest.Mock;
        query: jest.Mock;
        end: jest.Mock;
      }> = [];

      class MockClient {
        connect = jest.fn(() => Promise.reject(new Error('still not ready')));
        query = jest.fn().mockResolvedValue({});
        end = jest.fn().mockResolvedValue(undefined);
        constructor() {
          instances.push(this);
        }
      }

      jest.doMock('pg', () => ({
        Client: MockClient,
        Pool: jest.fn(),
      }));

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migrate = require('../scripts/migrate').default;
      const migratePromise = migrate(undefined, { maxAttempts: 3, delayMs: 100 });
      await jest.runAllTimersAsync();
      const result = await migratePromise;

      expect(result).toBe(false);
      expect(process.exit).toHaveBeenCalledWith(1);
      expect(instances.length).toBe(3);
      instances.forEach((instance) => {
        expect(instance.query).not.toHaveBeenCalled();
        expect(instance.end).toHaveBeenCalledTimes(1);
      });

      const delays = timeoutSpy.mock.calls.map((call) => call[1]);
      expect(delays).toContain(100);
      expect(delays).toContain(200);
    } finally {
      timeoutSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  test('poolOverride skips client creation and connect', async () => {
    process.env.DATABASE_URL = 'postgres://example';

    const mockPool = {
      query: jest.fn().mockResolvedValue({}),
    };
    const Client = jest.fn();

    jest.doMock('pg', () => ({
      Client,
      Pool: jest.fn(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const migrate = require('../scripts/migrate').default;
    const result = await migrate(mockPool);

    expect(result).toBe(true);
    expect(Client).not.toHaveBeenCalled();
    expect(mockPool.query).toHaveBeenCalledWith('BEGIN');
    expect(mockPool.query).toHaveBeenCalledWith('COMMIT');
  });
});
