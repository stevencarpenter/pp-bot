import { pool } from '../../db';

const migrate =
  jest.requireActual<typeof import('../../scripts/migrate')>('../../scripts/migrate').default;

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  if (!(await migrate(pool))) throw new Error('Test schema migration failed');
  initialized = true;
}
