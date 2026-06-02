const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'require', 'required', 'on']);
const DISABLED_VALUES = new Set(['0', 'false', 'no', 'disable', 'disabled', 'off']);

export function getPostgresSettings(env = process.env) {
  const connectionString =
    env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_CONNECTION_STRING || env.PG_CONNECTION_STRING || '';
  const sslMode = env.DATABASE_SSL || env.PGSSLMODE || '';

  return {
    configured: Boolean(connectionString),
    connectionString,
    ssl: resolveSslMode(sslMode, connectionString),
  };
}

export function getPublicPostgresStatus(env = process.env) {
  const settings = getPostgresSettings(env);

  return {
    configured: settings.configured,
    ssl: Boolean(settings.ssl),
  };
}

function resolveSslMode(sslMode, connectionString) {
  const normalized = String(sslMode).trim().toLowerCase();

  if (DISABLED_VALUES.has(normalized)) {
    return false;
  }

  if (ENABLED_VALUES.has(normalized)) {
    return { rejectUnauthorized: false };
  }

  if (connectionString.includes('sslmode=require')) {
    return { rejectUnauthorized: false };
  }

  return false;
}
