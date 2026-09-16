import { buildThrottlerOptions } from '@infra/ratelimit/throttler-options.factory';
import { parseEnv } from '../../../src/config/env';
import { ConfigService } from '../../../src/config/config.service';

function config(overrides: Partial<Record<string, string>> = {}): ConfigService {
  return new ConfigService(parseEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://blog:blog@localhost:5432/blog',
    SESSION_SECRET: 'a-very-long-session-secret',
    REDIS_URL: 'redis://localhost:6379',
    ...overrides,
  } as NodeJS.ProcessEnv));
}

describe('buildThrottlerOptions', () => {
  it('returns the seven named throttlers with env-derived ttl/limit', () => {
    const opts = buildThrottlerOptions(config());
    const byName = Object.fromEntries(opts.map((o) => [o.name, o]));

    expect(byName['default']).toEqual(expect.objectContaining({ name: 'default', ttl: 15, limit: 100 }));
    expect(byName['login-ip']).toEqual(expect.objectContaining({ name: 'login-ip', ttl: 900, limit: 10 }));
    expect(byName['login-email']).toEqual(expect.objectContaining({ name: 'login-email', ttl: 900, limit: 10 }));
    expect(byName['register']).toEqual(expect.objectContaining({ name: 'register', ttl: 3600, limit: 5 }));
    expect(byName['resend-verification']).toEqual(expect.objectContaining({ name: 'resend-verification', ttl: 3600, limit: 3 }));
    expect(byName['resend-reset']).toEqual(expect.objectContaining({ name: 'resend-reset', ttl: 3600, limit: 3 }));
    expect(byName['reset-submit']).toEqual(expect.objectContaining({ name: 'reset-submit', ttl: 3600, limit: 5 }));
  });

  it('honors env overrides', () => {
    const opts = buildThrottlerOptions(config({ RATE_LIMIT_LOGIN_LIMIT: '3', RATE_LIMIT_GLOBAL_TTL: '30' }));
    const byName = Object.fromEntries(opts.map((o) => [o.name, o]));
    expect(byName['login-ip'].limit).toBe(3);
    expect(byName['login-email'].limit).toBe(3);
    expect(byName['default'].ttl).toBe(30);
  });

  it('uses the fixed 3600s TTL for register/resend/reset regardless of env', () => {
    const opts = buildThrottlerOptions(config());
    for (const name of ['register', 'resend-verification', 'resend-reset', 'reset-submit']) {
      expect(opts.find((o) => o.name === name)?.ttl).toBe(3600);
    }
  });
});
