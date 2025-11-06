// Jest setup: provide an in-memory database URL so integration tests run.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
// Always use pg-mem for tests, even if DATABASE_URL is set in the environment
// This prevents tests from accidentally connecting to real databases
process.env.DATABASE_URL = 'pgmem://test-db';
