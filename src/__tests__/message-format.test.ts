/**
 * Tests for vote message format including point delta
 */

import { createApp } from '../index';
import { getPool } from '../storage/pool';
import { ensureSchema } from './helpers/schema';
import * as bolt from '@slack/bolt';

describe('Vote message format', () => {
  const originalEnv = { ...process.env };
  type CapturedMessageHandler = (args: {
    message: { text: string; user: string; channel?: string; ts?: string };
    body?: { event_id?: string };
    say: jest.Mock;
  }) => Promise<void>;

  beforeAll(async () => {
    await ensureSchema();
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = 'pgmem://test-message-format';
    process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
    process.env.SLACK_SIGNING_SECRET = 'test-secret';
    process.env.SLACK_APP_TOKEN = 'xapp-test-token';
    process.env.LOG_LEVEL = 'error';
    await getPool().query('DELETE FROM message_dedupe');
    await getPool().query('DELETE FROM leaderboard');
    await getPool().query('DELETE FROM vote_history');
    await getPool().query('DELETE FROM thing_leaderboard');
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('should display +1 delta for single ++ vote on user', async () => {
    const handlers: CapturedMessageHandler[] = [];
    const appSpy = jest.spyOn(bolt, 'App') as unknown as jest.SpyInstance;
    appSpy.mockImplementation(
      () =>
        ({
          start: jest.fn().mockResolvedValue(undefined),
          message: (handler: CapturedMessageHandler) => handlers.push(handler),
          command: jest.fn(),
        }) as unknown as bolt.App
    );

    try {
      createApp();
      const handler = handlers[0];
      const say = jest.fn();

      await handler({
        message: { text: '<@UTARGET> ++', user: 'UVOTER', channel: 'C1', ts: '1.1' },
        body: { event_id: 'Ev1' },
        say,
      });

      expect(say).toHaveBeenCalledWith("<@UTARGET>'s score increased by +1 to 1");
    } finally {
      appSpy.mockRestore();
    }
  });

  test('should display -1 delta for single -- vote on user', async () => {
    const handlers: CapturedMessageHandler[] = [];
    const appSpy = jest.spyOn(bolt, 'App') as unknown as jest.SpyInstance;
    appSpy.mockImplementation(
      () =>
        ({
          start: jest.fn().mockResolvedValue(undefined),
          message: (handler: CapturedMessageHandler) => handlers.push(handler),
          command: jest.fn(),
        }) as unknown as bolt.App
    );

    try {
      createApp();
      const handler = handlers[0];
      const say = jest.fn();

      await handler({
        message: { text: '<@UTARGET> --', user: 'UVOTER', channel: 'C1', ts: '1.2' },
        body: { event_id: 'Ev2' },
        say,
      });

      expect(say).toHaveBeenCalledWith("<@UTARGET>'s score decreased by -1 to -1");
    } finally {
      appSpy.mockRestore();
    }
  });

  test('should display +3 delta for ++++ vote on user', async () => {
    const handlers: CapturedMessageHandler[] = [];
    const appSpy = jest.spyOn(bolt, 'App') as unknown as jest.SpyInstance;
    appSpy.mockImplementation(
      () =>
        ({
          start: jest.fn().mockResolvedValue(undefined),
          message: (handler: CapturedMessageHandler) => handlers.push(handler),
          command: jest.fn(),
        }) as unknown as bolt.App
    );

    try {
      createApp();
      const handler = handlers[0];
      const say = jest.fn();

      await handler({
        message: { text: '<@UTARGET> ++++', user: 'UVOTER', channel: 'C1', ts: '1.3' },
        body: { event_id: 'Ev3' },
        say,
      });

      expect(say).toHaveBeenCalledWith("<@UTARGET>'s score increased by +3 to 3");
    } finally {
      appSpy.mockRestore();
    }
  });

  test('should display -2 delta for --- vote on user', async () => {
    const handlers: CapturedMessageHandler[] = [];
    const appSpy = jest.spyOn(bolt, 'App') as unknown as jest.SpyInstance;
    appSpy.mockImplementation(
      () =>
        ({
          start: jest.fn().mockResolvedValue(undefined),
          message: (handler: CapturedMessageHandler) => handlers.push(handler),
          command: jest.fn(),
        }) as unknown as bolt.App
    );

    try {
      createApp();
      const handler = handlers[0];
      const say = jest.fn();

      await handler({
        message: { text: '<@UTARGET> ---', user: 'UVOTER', channel: 'C1', ts: '1.4' },
        body: { event_id: 'Ev4' },
        say,
      });

      expect(say).toHaveBeenCalledWith("<@UTARGET>'s score decreased by -2 to -2");
    } finally {
      appSpy.mockRestore();
    }
  });

  test('should display +1 delta for ++ vote on thing', async () => {
    const handlers: CapturedMessageHandler[] = [];
    const appSpy = jest.spyOn(bolt, 'App') as unknown as jest.SpyInstance;
    appSpy.mockImplementation(
      () =>
        ({
          start: jest.fn().mockResolvedValue(undefined),
          message: (handler: CapturedMessageHandler) => handlers.push(handler),
          command: jest.fn(),
        }) as unknown as bolt.App
    );

    try {
      createApp();
      const handler = handlers[0];
      const say = jest.fn();

      await handler({
        message: { text: '@broncos ++', user: 'UVOTER', channel: 'C1', ts: '1.5' },
        body: { event_id: 'Ev5' },
        say,
      });

      expect(say).toHaveBeenCalledWith('Score for *broncos* increased by +1 to 1');
    } finally {
      appSpy.mockRestore();
    }
  });

  test('should display -1 delta for -- vote on thing', async () => {
    const handlers: CapturedMessageHandler[] = [];
    const appSpy = jest.spyOn(bolt, 'App') as unknown as jest.SpyInstance;
    appSpy.mockImplementation(
      () =>
        ({
          start: jest.fn().mockResolvedValue(undefined),
          message: (handler: CapturedMessageHandler) => handlers.push(handler),
          command: jest.fn(),
        }) as unknown as bolt.App
    );

    try {
      createApp();
      const handler = handlers[0];
      const say = jest.fn();

      await handler({
        message: { text: '@release --', user: 'UVOTER', channel: 'C1', ts: '1.6' },
        body: { event_id: 'Ev6' },
        say,
      });

      expect(say).toHaveBeenCalledWith('Score for *release* decreased by -1 to -1');
    } finally {
      appSpy.mockRestore();
    }
  });

  test('should display +2 delta for +++ vote on thing', async () => {
    const handlers: CapturedMessageHandler[] = [];
    const appSpy = jest.spyOn(bolt, 'App') as unknown as jest.SpyInstance;
    appSpy.mockImplementation(
      () =>
        ({
          start: jest.fn().mockResolvedValue(undefined),
          message: (handler: CapturedMessageHandler) => handlers.push(handler),
          command: jest.fn(),
        }) as unknown as bolt.App
    );

    try {
      createApp();
      const handler = handlers[0];
      const say = jest.fn();

      await handler({
        message: { text: '@project +++', user: 'UVOTER', channel: 'C1', ts: '1.7' },
        body: { event_id: 'Ev7' },
        say,
      });

      expect(say).toHaveBeenCalledWith('Score for *project* increased by +2 to 2');
    } finally {
      appSpy.mockRestore();
    }
  });
});
