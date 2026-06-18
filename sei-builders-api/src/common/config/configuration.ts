export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),

  app: {
    env: process.env.NODE_ENV ?? 'development',
    name: process.env.APP_NAME ?? 'SEI Builders Hub',
    url: process.env.APP_URL ?? 'http://localhost:3001',
    frontendUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
    corsOrigins: process.env.CORS_ORIGINS ?? 'http://localhost:3000',
  },

  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'sei_builders',
    password: process.env.DB_PASSWORD ?? 'sei_builders_secret',
    database: process.env.DB_DATABASE ?? 'sei_builders_hub',
    schema: process.env.DB_SCHEMA ?? 'public',
    ssl: process.env.DB_SSL === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? '100', 10),
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    ttl: parseInt(process.env.REDIS_TTL ?? '3600', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'sei:',
  },

  jwt: {
    secret: process.env.JWT_ACCESS_SECRET ?? 'CHANGE_ME_access_secret_32_chars_min',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'CHANGE_ME_refresh_secret_32_chars',
    // Expiry in seconds: 15m = 900, 7d = 604800
    accessExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN ?? '900', 10),
    refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN ?? '604800', 10),
    cookieDomain: process.env.JWT_COOKIE_DOMAIN ?? 'localhost',
    cookieSecure: process.env.JWT_COOKIE_SECURE === 'true',
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GITHUB_CALLBACK_URL ??
      'http://localhost:3001/api/v1/auth/github/callback',
    appId: process.env.GITHUB_APP_ID ?? '',
    privateKeyPath: process.env.GITHUB_APP_PRIVATE_KEY_PATH ?? '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY ?? 'CHANGE_ME_encryption_key_32_chars_!!',
    iv: process.env.ENCRYPTION_IV ?? 'CHANGE_ME_iv_16ch',
  },

  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },

  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST ?? process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT ?? process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.QUEUE_REDIS_PASSWORD ?? process.env.REDIS_PASSWORD ?? undefined,
    },
  },

  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    pretty: process.env.LOG_PRETTY === 'true',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: process.env.SWAGGER_TITLE ?? 'SEI Builders Hub API',
    description:
      process.env.SWAGGER_DESCRIPTION ?? 'Production API for SEI Builders Hub',
    version: process.env.SWAGGER_VERSION ?? '1.0',
    path: process.env.SWAGGER_PATH ?? 'docs',
  },
});
