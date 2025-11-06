/**
 * Tests for bot startup and migration bootstrapping
 */

import { createApp } from '../index';

describe('Bot startup', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set up test environment with pgmem URL
    process.env.DATABASE_URL = 'pgmem://test-startup';
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('should create app with required environment variables', () => {
    const app = createApp();
    expect(app).toBeDefined();
  });

  test('should throw error when required Slack env vars are missing', () => {
    delete process.env.SLACK_BOT_TOKEN;
    expect(() => createApp()).toThrow('Missing required Slack environment variables');
  });
});
