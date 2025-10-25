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
    on() {
      /* no-op for event listeners */
    },
    emit() {
      /* no-op */
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
    connectionTimeoutMillis: 5000,
  });
  g.__ALL_POOLS__.push(p);
  return p;
}

export const pool: any = createPool();

// Only attach listeners for real Pool (not ephemeral)
if (!pool._isEphemeral) {
  pool.on('connect', () => logger.info('✓ Database connection established'));
  pool.on('error', (err: unknown) => logger.error('✗ Unexpected database error:', err));
}

export default pool as Pool;
