import logger from '../logger';
import { getPool } from './pool';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const BOOLEAN_TRUE = new Set(['1', 'true', 'yes', 'on']);
const BOOLEAN_FALSE = new Set(['0', 'false', 'no', 'off']);

export interface MaintenanceConfig {
  enabled: boolean;
  dedupeRetentionDays: number;
  voteHistoryRetentionDays: number;
}

export interface MaintenanceResult {
  ran: boolean;
  dedupeDeleted: number;
  voteHistoryDeleted: number;
  dedupeCutoff?: Date;
  voteHistoryCutoff?: Date;
}

function parseBooleanEnv(env: NodeJS.ProcessEnv, name: string, defaultValue: boolean): boolean {
  const rawValue = env[name];
  if (!rawValue || rawValue.trim() === '') {
    return defaultValue;
  }
  const normalized = rawValue.toLowerCase();
  if (BOOLEAN_TRUE.has(normalized)) return true;
  if (BOOLEAN_FALSE.has(normalized)) return false;
  throw new Error(`Invalid ${name} value "${rawValue}". Expected one of: true, false.`);
}

function parseDaysEnv(env: NodeJS.ProcessEnv, name: string, defaultValue: number): number {
  const rawValue = env[name];
  if (!rawValue || rawValue.trim() === '') {
    return defaultValue;
  }
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`Invalid ${name} value "${rawValue}". Expected an integer >= 1.`);
  }
  return parsed;
}

export function getMaintenanceConfig(env: NodeJS.ProcessEnv = process.env): MaintenanceConfig {
  return {
    enabled: parseBooleanEnv(env, 'MAINTENANCE_ENABLED', true),
    dedupeRetentionDays: parseDaysEnv(env, 'MAINTENANCE_DEDUPE_RETENTION_DAYS', 14),
    voteHistoryRetentionDays: parseDaysEnv(env, 'MAINTENANCE_VOTE_HISTORY_RETENTION_DAYS', 365),
  };
}

function createResult(ran: boolean): MaintenanceResult {
  return {
    ran,
    dedupeDeleted: 0,
    voteHistoryDeleted: 0,
  };
}

export async function runMaintenance(
  config: MaintenanceConfig = getMaintenanceConfig(),
  now: Date = new Date()
): Promise<MaintenanceResult> {
  if (!config.enabled) {
    logger.info('Maintenance is disabled by MAINTENANCE_ENABLED=false');
    return createResult(false);
  }

  if (!process.env.DATABASE_URL) {
    logger.info('Skipping maintenance - DATABASE_URL not set');
    return createResult(false);
  }

  const pool = getPool();
  const dedupeCutoff = new Date(now.getTime() - config.dedupeRetentionDays * 24 * 60 * 60 * 1000);
  const voteHistoryCutoff = new Date(
    now.getTime() - config.voteHistoryRetentionDays * 24 * 60 * 60 * 1000
  );

  const dedupeDelete = await pool.query('DELETE FROM message_dedupe WHERE created_at < $1', [
    dedupeCutoff,
  ]);
  const voteHistoryDelete = await pool.query('DELETE FROM vote_history WHERE created_at < $1', [
    voteHistoryCutoff,
  ]);

  const result: MaintenanceResult = {
    ran: true,
    dedupeDeleted: dedupeDelete.rowCount ?? 0,
    voteHistoryDeleted: voteHistoryDelete.rowCount ?? 0,
    dedupeCutoff,
    voteHistoryCutoff,
  };

  logger.info('Maintenance cleanup complete', {
    dedupeDeleted: result.dedupeDeleted,
    voteHistoryDeleted: result.voteHistoryDeleted,
    dedupeCutoff: result.dedupeCutoff?.toISOString(),
    voteHistoryCutoff: result.voteHistoryCutoff?.toISOString(),
  });

  return result;
}

export function scheduleMaintenance(
  config: MaintenanceConfig = getMaintenanceConfig()
): NodeJS.Timeout {
  const timer = setInterval(() => {
    runMaintenance(config).catch((error) => {
      logger.error('Maintenance cleanup failed:', error);
    });
  }, TWELVE_HOURS_MS);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}
