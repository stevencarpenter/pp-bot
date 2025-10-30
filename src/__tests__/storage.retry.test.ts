import {waitForDatabase} from '../db';
import {withDatabaseRetry} from '../storage/database';

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

    test('retries when connection times out', async () => {
        let attempts = 0;
        const result = await withDatabaseRetry(async () => {
            attempts += 1;
            if (attempts === 1) {
                const error: any = new Error('connect ETIMEDOUT 10.0.0.1:5432');
                error.code = 'ETIMEDOUT';
                error.errno = -110;
                throw error;
            }
            return 'success';
        });

        expect(result).toBe('success');
        expect(waitForDatabaseMock).toHaveBeenCalledTimes(1);
    });

    test('retries AggregateError with transient inner errors', async () => {
        let attempts = 0;
        const result = await withDatabaseRetry(async () => {
            attempts += 1;
            if (attempts === 1) {
                const inner: any = new Error('connect ECONNREFUSED ::1:5432');
                inner.code = 'ECONNREFUSED';
                inner.errno = -111;
                throw new AggregateError([inner], 'AggregateError [ECONNREFUSED]');
            }
            return 'success';
        });

        expect(result).toBe('success');
        expect(waitForDatabaseMock).toHaveBeenCalledTimes(1);
    });

    test('retries AggregateError when top-level code is transient', async () => {
        let attempts = 0;
        const result = await withDatabaseRetry(async () => {
            attempts += 1;
            if (attempts === 1) {
                const inner: any = new Error('low-level failure');
                // Intentionally omit code on the inner error to ensure top-level metadata is used.
                const aggregate: any = new AggregateError([inner], 'AggregateError [ETIMEDOUT]');
                aggregate.code = 'ETIMEDOUT';
                throw aggregate;
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
                {retries: 2}
            )
        ).rejects.toThrow('the database system is starting up');

        // One wait per failed attempt before giving up
        expect(waitForDatabaseMock).toHaveBeenCalledTimes(1);
    });
});
