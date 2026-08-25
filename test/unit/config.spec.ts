import { parseEnv } from '../../src/config/env';
import { ConfigService } from '../../src/config/config.service';

const DB_URL = 'postgresql://blog:blog@localhost:5432/blog?schema=public';
const SESSION_SECRET = 'a-very-long-session-secret';
const REDIS_URL = 'redis://localhost:6379';

describe('parseEnv', () => {
  it('parses a valid env', () => {
    const env = parseEnv({
      NODE_ENV: 'development',
      PORT: '4000',
      DATABASE_URL: DB_URL,
      SESSION_SECRET,
      REDIS_URL,
    } as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.DATABASE_URL).toBe(DB_URL);
  });

  it('applies the PORT default', () => {
    const env = parseEnv({
      NODE_ENV: 'production',
      DATABASE_URL: DB_URL,
      SESSION_SECRET,
      REDIS_URL,
    } as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3000);
  });

  it('throws on an invalid NODE_ENV', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'nope', DATABASE_URL: DB_URL, SESSION_SECRET, REDIS_URL } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid environment/);
  });

  it('throws when DATABASE_URL is missing or blank', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'test', SESSION_SECRET, REDIS_URL } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid environment/);
    expect(() =>
      parseEnv({ NODE_ENV: 'test', DATABASE_URL: '   ', SESSION_SECRET, REDIS_URL } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid environment/);
  });
});

describe('ConfigService', () => {
  it('returns typed values', () => {
    const svc = new ConfigService({
      NODE_ENV: 'test',
      PORT: 3001,
      DATABASE_URL: DB_URL,
      SESSION_SECRET,
      REDIS_URL,
    });
    expect(svc.get('NODE_ENV')).toBe('test');
    expect(svc.get('PORT')).toBe(3001);
    expect(svc.get('DATABASE_URL')).toBe(DB_URL);
  });
});
