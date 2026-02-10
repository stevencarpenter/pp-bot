import { assertSecureDbSslPolicy, getDatabaseSslConfig } from '../security/db-ssl';

describe('database SSL policy', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('production defaults to verify-full', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    delete process.env.DB_SSL_MODE;

    const config = getDatabaseSslConfig();
    expect(config.mode).toBe('verify-full');
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
  });

  test('non-production defaults to disable', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    delete process.env.DB_SSL_MODE;

    const config = getDatabaseSslConfig();
    expect(config.mode).toBe('disable');
    expect(config.ssl).toBe(false);
  });

  test('production blocks insecure mode without explicit override', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.DB_SSL_MODE = 'disable';
    delete process.env.ALLOW_INSECURE_DB_SSL;

    expect(() => assertSecureDbSslPolicy()).toThrow(
      'Insecure database SSL mode "disable" is blocked in production.'
    );
  });

  test('production allows insecure mode when override is enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.DB_SSL_MODE = 'require';
    process.env.ALLOW_INSECURE_DB_SSL = 'true';

    expect(() => assertSecureDbSslPolicy()).not.toThrow();
    expect(getDatabaseSslConfig().ssl).toEqual({ rejectUnauthorized: false });
  });

  test('trims ALLOW_INSECURE_DB_SSL before parsing', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
    process.env.DB_SSL_MODE = 'require';
    process.env.ALLOW_INSECURE_DB_SSL = ' true \n';

    expect(() => assertSecureDbSslPolicy()).not.toThrow();
    expect(getDatabaseSslConfig().allowInsecure).toBe(true);
  });

  test('invalid DB_SSL_MODE is rejected', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL_MODE = 'invalid-mode';

    expect(() => getDatabaseSslConfig()).toThrow('Invalid DB_SSL_MODE');
  });

  test('trims DB_SSL_MODE before parsing', () => {
    process.env.NODE_ENV = 'production';
    process.env.DB_SSL_MODE = ' verify-full ';

    const config = getDatabaseSslConfig();
    expect(config.mode).toBe('verify-full');
  });

  test('invalid ALLOW_INSECURE_DB_SSL is rejected', () => {
    process.env.ALLOW_INSECURE_DB_SSL = 'maybe';

    expect(() => getDatabaseSslConfig()).toThrow('Invalid ALLOW_INSECURE_DB_SSL');
  });

  test('decodes DB_SSL_CA_PEM_B64 for TLS configs', () => {
    process.env.DB_SSL_MODE = 'verify-full';
    const pem = ['-----BEGIN CERTIFICATE-----', 'ZmFrZS1jYQ==', '-----END CERTIFICATE-----'].join(
      '\n'
    );
    process.env.DB_SSL_CA_PEM_B64 = Buffer.from(pem, 'utf8').toString('base64');

    const config = getDatabaseSslConfig();
    expect(config.ca).toBe(pem);
    expect(config.ssl).toEqual({ rejectUnauthorized: true, ca: pem });
  });

  test('rejects malformed DB_SSL_CA_PEM_B64 values', () => {
    process.env.DB_SSL_MODE = 'verify-full';
    process.env.DB_SSL_CA_PEM_B64 = 'not-base64';

    expect(() => getDatabaseSslConfig()).toThrow(
      'Invalid DB_SSL_CA_PEM_B64 value: expected a valid base64-encoded certificate bundle'
    );
  });

  test('rejects non-PEM decoded DB_SSL_CA_PEM_B64 values', () => {
    process.env.DB_SSL_MODE = 'verify-full';
    process.env.DB_SSL_CA_PEM_B64 = Buffer.from('my-ca', 'utf8').toString('base64');

    expect(() => getDatabaseSslConfig()).toThrow(
      'Invalid DB_SSL_CA_PEM_B64 value: decoded value must include at least one PEM certificate block'
    );
  });

  test('pgmem URLs skip strict policy enforcement', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'pgmem://test-db';
    process.env.DB_SSL_MODE = 'disable';

    expect(() => assertSecureDbSslPolicy()).not.toThrow();
  });
});
