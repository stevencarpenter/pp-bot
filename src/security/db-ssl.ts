import type { PoolConfig } from 'pg';

export type DbSslMode = 'disable' | 'require' | 'verify-full';

export interface DatabaseSslConfig {
  mode: DbSslMode;
  ssl: PoolConfig['ssl'];
  ca?: string;
  allowInsecure: boolean;
}

const DB_SSL_MODES: DbSslMode[] = ['disable', 'require', 'verify-full'];
const BOOLEAN_TRUE = new Set(['1', 'true', 'yes', 'on']);
const BOOLEAN_FALSE = new Set(['0', 'false', 'no', 'off']);
const BASE64_CERT_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const PEM_CERTIFICATE_PATTERN = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/;

function resolveNodeEnv(env: NodeJS.ProcessEnv): string {
  return (env.NODE_ENV || 'development').toLowerCase();
}

function parseBooleanEnv(env: NodeJS.ProcessEnv, name: string, defaultValue: boolean): boolean {
  const rawValue = env[name];
  if (rawValue === undefined || rawValue.trim() === '') {
    return defaultValue;
  }
  const normalized = rawValue.trim().toLowerCase();
  if (BOOLEAN_TRUE.has(normalized)) return true;
  if (BOOLEAN_FALSE.has(normalized)) return false;
  const allowedValues = [...BOOLEAN_TRUE, ...BOOLEAN_FALSE];
  throw new Error(
    `Invalid ${name} value "${rawValue}". Expected one of: ${allowedValues.join(', ')}.`
  );
}

function getSslMode(env: NodeJS.ProcessEnv): DbSslMode {
  const raw = env.DB_SSL_MODE;
  if (!raw || raw.trim() === '') {
    return resolveNodeEnv(env) === 'production' ? 'verify-full' : 'disable';
  }
  const normalized = raw.trim().toLowerCase();
  if (DB_SSL_MODES.includes(normalized as DbSslMode)) {
    return normalized as DbSslMode;
  }
  throw new Error(`Invalid DB_SSL_MODE "${raw}". Expected one of: ${DB_SSL_MODES.join(', ')}.`);
}

function decodeCertificateAuthority(base64Value: string): string {
  try {
    const normalizedInput = base64Value.replace(/\s+/g, '');
    if (!normalizedInput || !BASE64_CERT_PATTERN.test(normalizedInput)) {
      throw new Error('expected a valid base64-encoded certificate bundle');
    }
    const decoded = Buffer.from(normalizedInput, 'base64').toString('utf8').trim();
    if (!decoded) {
      throw new Error('decoded value is empty');
    }
    if (!PEM_CERTIFICATE_PATTERN.test(decoded)) {
      throw new Error('decoded value must include at least one PEM certificate block');
    }
    return decoded;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid DB_SSL_CA_PEM_B64 value: ${message}`);
  }
}

export function getDatabaseSslConfig(env: NodeJS.ProcessEnv = process.env): DatabaseSslConfig {
  const mode = getSslMode(env);
  const allowInsecure = parseBooleanEnv(env, 'ALLOW_INSECURE_DB_SSL', false);
  const rawCa = env.DB_SSL_CA_PEM_B64?.trim();
  const ca = rawCa ? decodeCertificateAuthority(rawCa) : undefined;

  if (mode === 'disable') {
    return { mode, ssl: false, ca, allowInsecure };
  }

  if (mode === 'require') {
    return {
      mode,
      ssl: {
        rejectUnauthorized: false,
        ...(ca ? { ca } : {}),
      },
      ca,
      allowInsecure,
    };
  }

  return {
    mode,
    ssl: {
      rejectUnauthorized: true,
      ...(ca ? { ca } : {}),
    },
    ca,
    allowInsecure,
  };
}

export function assertSecureDbSslPolicy(env: NodeJS.ProcessEnv = process.env): void {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.startsWith('pgmem://')) {
    return;
  }

  if (resolveNodeEnv(env) !== 'production') {
    return;
  }

  const config = getDatabaseSslConfig(env);
  if (config.mode !== 'verify-full' && !config.allowInsecure) {
    throw new Error(
      `Insecure database SSL mode "${config.mode}" is blocked in production. ` +
        'Use DB_SSL_MODE=verify-full or set ALLOW_INSECURE_DB_SSL=true to override intentionally.'
    );
  }
}
