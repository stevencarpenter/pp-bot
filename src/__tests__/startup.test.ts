/**
 * Tests for bot startup and migration bootstrapping
 */

import { createApp, start } from '../index';
import { getPool } from '../storage/pool';
import migrate from '../scripts/migrate';
import logger from '../logger';
import { ensureSchema } from './helpers/schema';

// Mock the migrate function
jest.mock('../scripts/migrate');
const mockMigrate = migrate as jest.MockedFunction<typeof migrate>;

// Mock the logger
jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Bot startup', () => {
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    await ensureSchema();
  });

  beforeEach(() => {
    // Set up test environment with pgmem URL
    process.env.DATABASE_URL = 'pgmem://test-startup';
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
    process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

    // Reset mocks
    jest.clearAllMocks();
    mockMigrate.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('createApp', () => {
    test('should throw error when required Slack env vars are missing', () => {
      delete process.env.SLACK_BOT_TOKEN;
      expect(() => createApp()).toThrow('Missing required environment variables: SLACK_BOT_TOKEN');
    });

    test('should dedupe blocked events before replying', async () => {
      await getPool().query('DELETE FROM message_dedupe');
      process.env.VOTE_ALLOWED_CHANNEL_IDS = 'C_ALLOWED';

      const handlers: Array<(args: any) => Promise<void>> = [];
      const appSpy = jest.spyOn(require('@slack/bolt'), 'App').mockImplementation(() => ({
        start: jest.fn().mockResolvedValue(undefined),
        message: (handler: any) => handlers.push(handler),
        command: jest.fn(),
      }));

      try {
        createApp();
        expect(handlers).toHaveLength(1);

        const handler = handlers[0];
        const say = jest.fn();
        const message = {
          text: '<@UTARGET> ++',
          user: 'UVOTER',
          channel: 'C_BLOCKED',
          ts: '1700000000.000100',
        };
        const body = { event_id: 'Ev-blocked-001' };

        await handler({ message, body, say });
        await handler({ message, body, say });

        expect(say).toHaveBeenCalledTimes(1);
        expect(say).toHaveBeenCalledWith('Voting is not enabled in this channel.');

        const dedupeRows = await getPool().query(
          'SELECT dedupe_key FROM message_dedupe WHERE dedupe_key = $1',
          ['event:Ev-blocked-001']
        );
        expect(dedupeRows.rowCount).toBe(1);
      } finally {
        appSpy.mockRestore();
      }
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
      expect(mockMigrate).toHaveBeenCalledWith(getPool());
      expect(logger.info).toHaveBeenCalledWith('Running database migrations...');
      expect(logger.info).toHaveBeenCalledWith('Database migrations complete');
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
      expect(logger.info).toHaveBeenCalledWith('Skipping migrations - DATABASE_URL not set');
    });

    test('should handle migration failure and exit', async () => {
      // Mock failed migration
      mockMigrate.mockResolvedValue(false);

      // Mock process.exit to prevent actual exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

      await start();

      // Verify error handling
      expect(mockMigrate).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
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
      expect(logger.error).toHaveBeenCalledWith('Failed to start app:', migrationError);
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });
});
