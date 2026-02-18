import { pool } from '../db';
import {
  getMaintenanceConfig,
  runMaintenance,
  scheduleMaintenance,
  type MaintenanceConfig,
} from '../storage/maintenance';
import { ensureSchema } from './helpers/schema';

describe('maintenance retention cleanup', () => {
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    await ensureSchema();
  });

  beforeEach(async () => {
    process.env = { ...originalEnv };
    await pool.query('DELETE FROM vote_history');
    await pool.query('DELETE FROM message_dedupe');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('deletes only rows older than configured cutoffs', async () => {
    const now = new Date('2026-02-10T00:00:00.000Z');
    const oldDedupeDate = new Date('2026-01-01T00:00:00.000Z');
    const freshDedupeDate = new Date('2026-02-09T00:00:00.000Z');

    const oldVoteDate = new Date('2024-12-01T00:00:00.000Z');
    const freshVoteDate = new Date('2026-02-09T00:00:00.000Z');

    await pool.query(
      'INSERT INTO message_dedupe (dedupe_key, channel_id, message_ts, created_at) VALUES ($1, $2, $3, $4)',
      ['event:old', 'C1', '1', oldDedupeDate]
    );
    await pool.query(
      'INSERT INTO message_dedupe (dedupe_key, channel_id, message_ts, created_at) VALUES ($1, $2, $3, $4)',
      ['event:fresh', 'C2', '2', freshDedupeDate]
    );

    await pool.query(
      `INSERT INTO vote_history (voter_id, voted_user_id, vote_type, channel_id, message_ts, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['U1', 'U2', '++', 'C1', '10.1', oldVoteDate]
    );
    await pool.query(
      `INSERT INTO vote_history (voter_id, voted_user_id, vote_type, channel_id, message_ts, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['U3', 'U4', '++', 'C1', '10.2', freshVoteDate]
    );

    const config: MaintenanceConfig = {
      enabled: true,
      dedupeRetentionDays: 14,
      voteHistoryRetentionDays: 365,
    };

    const result = await runMaintenance(config, now);
    expect(result.ran).toBe(true);
    expect(result.dedupeDeleted).toBe(1);
    expect(result.voteHistoryDeleted).toBe(1);

    const dedupeRows = await pool.query(
      'SELECT dedupe_key FROM message_dedupe ORDER BY dedupe_key'
    );
    expect(dedupeRows.rows).toEqual([{ dedupe_key: 'event:fresh' }]);

    const voteRows = await pool.query('SELECT voter_id FROM vote_history ORDER BY voter_id');
    expect(voteRows.rows).toEqual([{ voter_id: 'U3' }]);

    const secondRun = await runMaintenance(config, now);
    expect(secondRun.dedupeDeleted).toBe(0);
    expect(secondRun.voteHistoryDeleted).toBe(0);
  });

  test('returns not-ran result when disabled or missing database', async () => {
    const disabled = await runMaintenance({
      enabled: false,
      dedupeRetentionDays: 14,
      voteHistoryRetentionDays: 365,
    });
    expect(disabled.ran).toBe(false);

    const previousUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const skipped = await runMaintenance({
      enabled: true,
      dedupeRetentionDays: 14,
      voteHistoryRetentionDays: 365,
    });
    expect(skipped.ran).toBe(false);
    process.env.DATABASE_URL = previousUrl;
  });

  test('parses config and validates env values', () => {
    process.env.MAINTENANCE_ENABLED = 'false';
    process.env.MAINTENANCE_DEDUPE_RETENTION_DAYS = '30';
    process.env.MAINTENANCE_VOTE_HISTORY_RETENTION_DAYS = '400';

    const config = getMaintenanceConfig();
    expect(config.enabled).toBe(false);
    expect(config.dedupeRetentionDays).toBe(30);
    expect(config.voteHistoryRetentionDays).toBe(400);

    process.env.MAINTENANCE_ENABLED = 'maybe';
    expect(() => getMaintenanceConfig()).toThrow('Invalid MAINTENANCE_ENABLED');

    process.env.MAINTENANCE_ENABLED = 'true';
    process.env.MAINTENANCE_DEDUPE_RETENTION_DAYS = '0';
    expect(() => getMaintenanceConfig()).toThrow('Invalid MAINTENANCE_DEDUPE_RETENTION_DAYS');
  });

  test('parses MAINTENANCE_ENABLED values with surrounding whitespace', () => {
    process.env.MAINTENANCE_ENABLED = ' false \n';

    const config = getMaintenanceConfig();
    expect(config.enabled).toBe(false);
  });

  test('rejects partially numeric maintenance day values', () => {
    process.env.MAINTENANCE_ENABLED = 'true';
    process.env.MAINTENANCE_DEDUPE_RETENTION_DAYS = '14days';

    expect(() => getMaintenanceConfig()).toThrow('Invalid MAINTENANCE_DEDUPE_RETENTION_DAYS');
  });

  test('scheduleMaintenance returns a timer handle', () => {
    const timer = scheduleMaintenance({
      enabled: true,
      dedupeRetentionDays: 14,
      voteHistoryRetentionDays: 365,
    });
    expect(typeof timer).toBe('object');
    clearInterval(timer);
  });
});
