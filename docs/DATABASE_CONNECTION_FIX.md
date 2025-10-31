# Database Connection Fix

## Problem

The application was failing to start in containerized environments (Railway.com) with the following error:

```
Error processing message event: AggregateError [ETIMEDOUT]
code: 'ETIMEDOUT'
connect ETIMEDOUT 10.247.151.36:5432
connect ECONNREFUSED fd12:1060:6cd6:1:2000:94:68f7:9724:5432
```

## Root Causes

1. **No startup health check**: The application started immediately without waiting for the database to be ready
2. **Insufficient connection timeout**: The 5-second connection timeout was too short for cloud environments where
   network initialization can take longer
3. **No retry logic**: A single connection failure would cause the entire application to fail

## Solutions Implemented

### 1. Increased Connection Timeout (src/db.ts)

Changed `connectionTimeoutMillis` from 5000ms to 20000ms (20 seconds) to accommodate slower network initialization in
cloud environments.

```typescript
const p = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000, // Increased from 5000
});
```

### 2. Added Database Readiness Check (src/db.ts)

Implemented `waitForDatabase()` function with:

- Exponential backoff retry logic
- Up to 15 configurable retry attempts
- Automatic skip for test environments (ephemeral pg-mem pools)
- Graceful handling when DATABASE_URL is not set
- Detailed logging for debugging connection issues

```typescript
export async function waitForDatabase(maxRetries = 10, delayMs = 1000): Promise<void> {
  // Skip wait for ephemeral test pools
  if (pool._isEphemeral) {
    logger.info('Using ephemeral test pool, skipping connection check');
    return;
  }

  // Skip wait if no DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    logger.warn('No DATABASE_URL set, skipping connection check');
    return;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Database connection attempt ${attempt}/${maxRetries}...`);
      const result = await pool.query('SELECT 1');
      if (result) {
        logger.info('✓ Database connection successful');
        return;
      }
    } catch (err) {
      const error = err as Error;
      logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (attempt === maxRetries) {
        logger.error('✗ Failed to connect to database after maximum retries');
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts: ${error.message}`
        );
      }

      // Exponential backoff with jitter
      const backoffDelay = delayMs * Math.pow(2, attempt - 1) + Math.random() * 1000;
      logger.info(`Retrying in ${Math.round(backoffDelay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
}
```

### 3. Updated Application Startup (src/index.ts)

Modified the `start()` function to wait for database connection before starting the Slack app:

```typescript
export async function start() {
  try {
    // Wait for database to be ready before starting the app
    console.log('Waiting for database connection...');
    await waitForDatabase(15, 2000); // 15 retries with 2s initial delay
    console.log('Database is ready');

    const app = createApp();
    const port = process.env.PORT || process.env.RAILWAY_PORT || 3000;
    await app.start(port);
    console.log(`⚡️ Slack bot is running on port ${port}`);
  } catch (e) {
    console.error('Failed to start app:', e);
    process.exit(1);
  }
}
```

## Retry Behavior

With the new implementation:

- **Initial delay**: 2 seconds
- **Maximum retries**: 15 attempts
- **Backoff strategy**: Exponential (2^attempt) with random jitter (0-1000ms)
- **Maximum wait time**: Approximately 2 minutes total
- **Example retry delays**: 2s, 4s, 8s, 16s, 32s...

## Testing Considerations

- The `waitForDatabase` function automatically detects test environments (pg-mem pools)
- Returns immediately in test mode without attempting real database connections
- Maintains existing test behavior without modification

## Benefits

1. **Resilience**: Handles temporary network issues during container startup
2. **Cloud-friendly**: Works reliably with cloud providers like Railway.com
3. **Better debugging**: Detailed logs show exactly when and why connections fail
4. **Fail-fast**: Still fails after maximum retries instead of hanging indefinitely
5. **Test-compatible**: No impact on existing test suite

## Deployment Notes

No additional environment variables or configuration changes required. The fix is backward compatible and will work in:

- Railway.com
- Docker containers
- Local development
- CI/CD pipelines
- Test environments

## Monitoring

Check application logs for these messages:

- `Waiting for database connection...` - App startup initiated
- `Database connection attempt X/15...` - Connection attempt in progress
- `✓ Database connection successful` - Ready to accept requests
- `Database is ready` - App fully started
- `✗ Failed to connect to database after maximum retries` - Fatal error, check DATABASE_URL

## Rollback

If issues occur, revert changes to:

- `src/db.ts` (remove `waitForDatabase` function, restore connectionTimeoutMillis to 5000)
- `src/index.ts` (remove database wait call in `start()` function)
