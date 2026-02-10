import { Pool } from 'pg';
import type { QueryResult } from 'pg';
import logger from './logger';
import { assertSecureDbSslPolicy, getDatabaseSslConfig } from './security/db-ssl';

type QueryParams = readonly unknown[] | undefined;
type PoolEventHandler = (...args: unknown[]) => void;

type PgMemClient = {
  connect(): Promise<void>;
  query(text: string, params?: QueryParams): Promise<QueryResult>;
  end(): Promise<void>;
};

type PoolLike = Pool & { _isEphemeral?: boolean };

type GlobalWithPools = typeof globalThis & { __ALL_POOLS__?: PoolLike[] };
const g = globalThis as GlobalWithPools;

function getAllPools(): PoolLike[] {
  if (!g.__ALL_POOLS__) {
    g.__ALL_POOLS__ = [];
  }
  return g.__ALL_POOLS__;
}

if (!process.env.DATABASE_URL) {
  logger.warn('⚠️  DATABASE_URL not set. Database features will not work until it is provided.');
}

function createTestEphemeralPool() {
  // Uses pg-mem with a persistent client to maintain state between queries
  let sharedClient: PgMemClient | null = null;
  let connected = false;

  // Store event listeners for testing
  const listeners: Record<string, PoolEventHandler[]> = {};

  async function getSharedClient(): Promise<PgMemClient> {
    if (sharedClient) {
      return sharedClient;
    }
    const { newDb } = await import('pg-mem');
    const db = newDb();
    const pgMem = db.adapters.createPg();
    sharedClient = new pgMem.Client() as PgMemClient;
    return sharedClient;
  }

  const poolLike = {
    async query(text: string, params?: QueryParams) {
      const client = await getSharedClient();
      if (!connected) {
        await client.connect();
        connected = true;
      }
      return await client.query(text, params);
    },
    async end() {
      if (connected && sharedClient) {
        await sharedClient.end();
        connected = false;
        sharedClient = null;
      }
    },
    on(event: string, handler: PoolEventHandler) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
    },
    emit(event: string, ...args: unknown[]) {
      if (listeners[event]) {
        listeners[event].forEach((handler) => handler(...args));
      }
    },
    _isEphemeral: true,
  };
  return poolLike as unknown as PoolLike;
}

function createPool(): PoolLike {
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL.startsWith('pgmem://')
  ) {
    // Ephemeral per-query client; no long-lived sockets.
    const p = createTestEphemeralPool();
    getAllPools().push(p);
    return p;
  }

  assertSecureDbSslPolicy();
  const sslConfig = getDatabaseSslConfig();
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig.ssl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000, // Increased from 5000 to 20000 for cloud environments
  });
  getAllPools().push(p);
  return p;
}

export const pool: PoolLike = createPool();

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
  if (pool._isEphemeral === true) {
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

export default pool as Pool;
