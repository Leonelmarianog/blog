// Jest setup: ensure process.env has the required keys so ConfigModule's
// parseEnv() succeeds during the AppModule compile test, without needing a
// real .env file or a database.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://blog:blog@localhost:5432/blog?schema=public';
