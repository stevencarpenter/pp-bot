import { Pool } from 'pg';
// Ensure type resolution for pg

// Reuse existing environment variable DATABASE_URL.
export function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

let singleton: Pool | null = null;
export function getPool(): Pool {
  if (!singleton) singleton = createPool();
  return singleton;
}
export default getPool;
