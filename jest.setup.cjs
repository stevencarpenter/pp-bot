// Jest setup: provide an in-memory database URL so integration tests run.
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.DOTENV_CONFIG_QUIET = process.env.DOTENV_CONFIG_QUIET || 'true';
// Always use pg-mem for tests, even if DATABASE_URL is set in the environment
// This prevents tests from accidentally connecting to real databases
process.env.DATABASE_URL = 'pgmem://test-db';
