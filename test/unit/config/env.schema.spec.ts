import { envSchema } from '../../../src/config/env.schema';

describe('envSchema', () => {
  const valid = {
    NODE_ENV: 'test' as const,
    PORT: 3000,
    DATABASE_URL: 'postgresql://x',
    SESSION_SECRET: 'a-very-long-session-secret',
    REDIS_URL: 'redis://localhost:6379',
  };

  it('accepts a valid env with SESSION_SECRET and REDIS_URL', () => {
    expect(envSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a SESSION_SECRET shorter than 16 chars', () => {
    const r = envSchema.safeParse({ ...valid, SESSION_SECRET: 'short' });
    expect(r.success).toBe(false);
  });

  it('rejects an empty REDIS_URL', () => {
    const r = envSchema.safeParse({ ...valid, REDIS_URL: '  ' });
    expect(r.success).toBe(false);
  });
});
