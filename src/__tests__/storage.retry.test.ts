import { waitForDatabase } from '../db';
import { withDatabaseRetry } from '../storage/database';

jest.mock('../db', () => {
  const actual = jest.requireActual('../db');
  return {
    ...actual,
    waitForDatabase: jest.fn().mockResolvedValue(undefined),
  };
});

describe('withDatabaseRetry', () => {
  const waitForDatabaseMock = waitForDatabase as jest.MockedFunction<typeof waitForDatabase>;

  beforeEach(() => {
    waitForDatabaseMock.mockClear();
  });

  test('retries when database is still starting up', async () => {
    let attempts = 0;
    const result = await withDatabaseRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        const error: any = new Error('the database system is starting up');
        error.code = '57P03';
        throw error;
      }
      return 'success';
    });

    expect(result).toBe('success');
    expect(waitForDatabaseMock).toHaveBeenCalledTimes(1);
  });

  test('does not retry non-startup errors', async () => {
    await expect(
      withDatabaseRetry(async () => {
        const error: any = new Error('syntax error');
        error.code = '42601';
        throw error;
      })
    ).rejects.toThrow('syntax error');

    expect(waitForDatabaseMock).not.toHaveBeenCalled();
  });

  test('propagates when retries are exhausted', async () => {
    await expect(
      withDatabaseRetry(
        async () => {
          const error: any = new Error('the database system is starting up');
          error.code = '57P03';
          throw error;
        },
        { retries: 2 }
      )
    ).rejects.toThrow('the database system is starting up');

    // One wait per failed attempt before giving up
    expect(waitForDatabaseMock).toHaveBeenCalledTimes(1);
  });
});
