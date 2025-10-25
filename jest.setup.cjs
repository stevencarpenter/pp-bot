// Jest setup: provide an in-memory database URL so integration tests run.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (!process.env.DATABASE_URL) {
    // Flag to use pg-mem via special URL scheme handled in src/db.ts & src/storage/pool.ts
    process.env.DATABASE_URL = 'pgmem://test-db';
}

