import { Pool } from 'pg';
import logger from './logger';

if (!process.env.DATABASE_URL) {
  logger.warn('⚠️  DATABASE_URL not set. Database features will not work until it is provided.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => logger.info('✓ Database connection established'));
pool.on('error', (err) => logger.error('✗ Unexpected database error:', err));

export default pool;

