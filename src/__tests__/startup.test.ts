/**
 * Tests for bot startup and migration bootstrapping
 */

import { createApp, start } from '../index';
import { pool } from '../db';
import migrate from '../scripts/migrate';

// Mock the migrate function
jest.mock('../scripts/migrate');
const mockMigrate = migrate as jest.MockedFunction<typeof migrate>;

describe('Bot startup', () => {
  const originalEnv = { ...process.env };
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Set up test environment with pgmem URL
    process.env.DATABASE_URL = 'pgmem://test-startup';
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
    process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

    // Mock console methods to reduce noise
    console.log = jest.fn();
    console.error = jest.fn();

    // Reset migrate mock
    mockMigrate.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  describe('createApp', () => {
    test('should throw error when required Slack env vars are missing', () => {
      delete process.env.SLACK_BOT_TOKEN;
      expect(() => createApp()).toThrow('Missing required Slack environment variables');
    });
  });

  describe('start function migration logic', () => {
    test('should run migrations when DATABASE_URL is set', async () => {
      // Mock successful migration
      mockMigrate.mockResolvedValue(true);

      // Mock app.start to prevent actual Slack connection
      const mockAppStart = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(require('@slack/bolt'), 'App').mockImplementation(() => ({
        start: mockAppStart,
        message: jest.fn(),
        command: jest.fn(),
      }));

      await start();

      // Verify migration was called with pool
      expect(mockMigrate).toHaveBeenCalledTimes(1);
      expect(mockMigrate).toHaveBeenCalledWith(pool);
      expect(console.log).toHaveBeenCalledWith('Running database migrations...');
      expect(console.log).toHaveBeenCalledWith('Database migrations complete');
    });

    test('should skip migrations when DATABASE_URL is not set', async () => {
      delete process.env.DATABASE_URL;
      mockMigrate.mockResolvedValue(true);

      // Mock app.start to prevent actual Slack connection
      const mockAppStart = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(require('@slack/bolt'), 'App').mockImplementation(() => ({
        start: mockAppStart,
        message: jest.fn(),
        command: jest.fn(),
      }));

      await start();

      // Verify migration was NOT called
      expect(mockMigrate).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Skipping migrations - DATABASE_URL not set');
    });

    test('should handle migration failure and exit', async () => {
      // Mock failed migration
      mockMigrate.mockResolvedValue(false);

      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      await start();

      // Verify error handling
      expect(mockMigrate).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to start app:',
        expect.objectContaining({
          message: 'Database migration failed',
        })
      );
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    test('should handle migration exception and exit', async () => {
      // Mock migration throwing an error
      const migrationError = new Error('Connection failed');
      mockMigrate.mockRejectedValue(migrationError);

      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      await start();

      // Verify error handling
      expect(mockMigrate).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith('Failed to start app:', migrationError);
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});
