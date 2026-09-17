// Jest setup: ensure process.env has the required keys so ConfigModule's
// parseEnv() succeeds during the AppModule compile test, without needing a
// real .env file or a database.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://blog:blog@localhost:5432/blog?schema=public';
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32chars-long!!';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Storage defaults: `??` so the integration container values from startContainers win,
// and unit tests get safe local-disk defaults (no S3 endpoint, local-disk driver).
process.env.STORAGE_DRIVER = process.env.STORAGE_DRIVER ?? 'local';
process.env.STORAGE_MAX_BYTES = process.env.STORAGE_MAX_BYTES ?? '5242880';
process.env.STORAGE_LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? './.storage-test';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? '';
process.env.S3_REGION = process.env.S3_REGION ?? '';
process.env.S3_BUCKET = process.env.S3_BUCKET ?? '';
process.env.S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID ?? '';
process.env.S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY ?? '';
process.env.S3_PUBLIC_BASE = process.env.S3_PUBLIC_BASE ?? '';
process.env.S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE ?? 'true';

// Rate limiting defaults (Plan 7b). `??` so integration container values win.
process.env.RATE_LIMIT_GLOBAL_TTL = process.env.RATE_LIMIT_GLOBAL_TTL ?? '15';
process.env.RATE_LIMIT_GLOBAL_LIMIT = process.env.RATE_LIMIT_GLOBAL_LIMIT ?? '100';
process.env.RATE_LIMIT_LOGIN_TTL = process.env.RATE_LIMIT_LOGIN_TTL ?? '900';
process.env.RATE_LIMIT_LOGIN_LIMIT = process.env.RATE_LIMIT_LOGIN_LIMIT ?? '10';
process.env.RATE_LIMIT_REGISTER_LIMIT = process.env.RATE_LIMIT_REGISTER_LIMIT ?? '5';
process.env.RATE_LIMIT_RESEND_LIMIT = process.env.RATE_LIMIT_RESEND_LIMIT ?? '3';
process.env.RATE_LIMIT_RESET_LIMIT = process.env.RATE_LIMIT_RESET_LIMIT ?? '5';
// Integration tests simulate rotating IPs via X-Forwarded-For, so trust one hop.
process.env.TRUST_PROXY = process.env.TRUST_PROXY ?? '1';

// Mail / queue defaults (Plan 7c). `??` so integration container values win.
process.env.MAIL_DRIVER = process.env.MAIL_DRIVER ?? 'log';
process.env.SMTP_HOST = process.env.SMTP_HOST ?? '';
process.env.SMTP_PORT = process.env.SMTP_PORT ?? '1025';
process.env.SMTP_USER = process.env.SMTP_USER ?? '';
process.env.SMTP_PASS = process.env.SMTP_PASS ?? '';
process.env.SMTP_SECURE = process.env.SMTP_SECURE ?? 'false';
process.env.MAIL_FROM = process.env.MAIL_FROM ?? 'no-reply@localhost';
process.env.APP_URL = process.env.APP_URL ?? 'http://localhost:3000';
