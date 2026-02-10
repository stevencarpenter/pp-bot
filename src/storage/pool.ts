// Unify storage layer with single shared Pool instance from src/db to avoid multiple open handles.
import type { Pool } from 'pg';

import { pool } from '../db';

export function getPool(): Pool {
  return pool;
}

export default getPool;
