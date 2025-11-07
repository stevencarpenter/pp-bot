# Test Database Connection Fix

## Problem

The `storage.retry.test.ts` test file was attempting to connect to a real PostgreSQL database instead of using the in-memory pg-mem database for testing. This happened because:

1. The shell environment had `DATABASE_URL` set to a real PostgreSQL instance (`postgres://ppbot:ppbot@localhost:5433/ppbot`)
2. The `jest.setup.cjs` file only set `DATABASE_URL=pgmem://test-db` if it wasn't already defined
3. Since `DATABASE_URL` was already in the environment, Jest used the real database URL
4. Tests tried to connect to `localhost:5433`, which caused connection errors

## Root Cause

In `jest.setup.cjs`:
```javascript
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'pgmem://test-db';
}
```

This conditional check meant that if `DATABASE_URL` was already set in the shell environment, the pgmem database would not be used for tests.

## Solution

### 1. Fixed jest.setup.cjs

Changed the setup to **always** use pg-mem for tests, regardless of environment variables:

```javascript
// Always use pg-mem for tests, even if DATABASE_URL is set in the environment
// This prevents tests from accidentally connecting to real databases
process.env.DATABASE_URL = 'pgmem://test-db';
```

### 2. Enhanced Test Isolation

Added comprehensive mocking to `storage.retry.test.ts` to ensure complete isolation:

- Mock `waitForDatabase` to avoid real connection attempts
- Mock the `pool` export from `db.ts`
- Mock the `getPool` function from `storage/pool.ts`

This ensures that even if the pg-mem pool creation somehow fails, the test won't try to connect to any database.

## Verification

The test should now:
- ✅ Use pg-mem in-memory database (via `pgmem://test-db`)
- ✅ Never attempt connections to real PostgreSQL instances
- ✅ Run independently of environment variables
- ✅ Have proper mocking to prevent accidental database access

## Note on Container Error

The original error message shown in the issue was from a **production container**, not from the test:

```
Error processing message event: AggregateError [ETIMEDOUT]:
  at async updateUserScore (/app/dist/storage/database.js:18:22)
```

This is a separate issue - the Railway container cannot connect to the PostgreSQL database at `10.247.151.36:5432`. This is likely a network connectivity or database configuration issue in Railway, not related to the test setup.

## Files Modified

1. `/Users/scarpenter/personal/pp-bot/jest.setup.cjs` - Force pg-mem for all tests
2. `/Users/scarpenter/personal/pp-bot/src/__tests__/storage.retry.test.ts` - Add comprehensive mocking

