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
