import { Pool } from 'pg';
import logger from './logger';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;
if (!g.__ALL_POOLS__) g.__ALL_POOLS__ = [];

if (!process.env.DATABASE_URL) {
  logger.warn('⚠️  DATABASE_URL not set. Database features will not work until it is provided.');
}

function createTestEphemeralPool() {
  // Uses pg-mem with a persistent client to maintain state between queries
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { newDb } = require('pg-mem');
  const db = newDb();
  const pgMem = db.adapters.createPg();
  // Use a single persistent client instead of creating new ones per query
  const sharedClient = new pgMem.Client();
  let connected = false;

  // Store event listeners for testing
  const listeners: { [event: string]: Array<(...args: any[]) => void> } = {};

  const poolLike: any = {
    async query(text: string, params?: any[]) {
      if (!connected) {
        await sharedClient.connect();
        connected = true;
      }
      return await sharedClient.query(text, params);
    },
    async end() {
      if (connected) {
        await sharedClient.end();
        connected = false;
      }
    },
    on(event: string, handler: (...args: any[]) => void) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
    },
    emit(event: string, ...args: any[]) {
      if (listeners[event]) {
        listeners[event].forEach((handler) => handler(...args));
      }
    },
    _isEphemeral: true,
  };
  return poolLike;
}

function createPool(): any {
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL.startsWith('pgmem://')
  ) {
    // Ephemeral per-query client; no long-lived sockets.
    const p = createTestEphemeralPool();
    g.__ALL_POOLS__.push(p);
    return p;
  }
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000, // Increased from 5000 to 20000 for cloud environments
  });
  g.__ALL_POOLS__.push(p);
  return p;
}

export const pool: any = createPool();

// Attach listeners for all pools (including ephemeral for testing)
pool.on('connect', () => logger.info('✓ Database connection established'));
pool.on('error', (err: unknown) => logger.error('✗ Unexpected database error:', err));

/**
 * Wait for database to be ready with retry logic
 * @param maxRetries Maximum number of connection attempts
 * @param delayMs Initial delay between retries in milliseconds
 * @returns Promise that resolves when database is ready
 */
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
      logger.warn(
        `Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`
      );

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

export default pool as Pool;
