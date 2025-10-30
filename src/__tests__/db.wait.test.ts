/**
 * Tests for waitForDatabase function
 */

import {waitForDatabase} from '../db';

describe('waitForDatabase', () => {
    const originalEnv = {...process.env};

    afterEach(() => {
        Object.assign(process.env, originalEnv);
    });

    test('should skip wait for ephemeral test pools', async () => {
        process.env.NODE_ENV = 'test';
        process.env.DATABASE_URL = 'pgmem://test-db';

        // Should complete immediately without errors
        await expect(waitForDatabase()).resolves.toBeUndefined();
    });

    test('should skip wait when DATABASE_URL is not set', async () => {
        delete process.env.DATABASE_URL;

        // Should complete immediately without errors
        await expect(waitForDatabase()).resolves.toBeUndefined();
    });
});
