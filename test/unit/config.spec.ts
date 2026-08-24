import { parseEnv } from '../../src/config/env';
import { ConfigService } from '../../src/config/config.service';

describe('parseEnv', () => {
  it('parses a valid env', () => {
    const env = parseEnv({ NODE_ENV: 'development', PORT: '4000' } as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
  });

  it('applies the PORT default', () => {
    const env = parseEnv({ NODE_ENV: 'production' } as NodeJS.ProcessEnv);
    expect(env.PORT).toBe(3000);
  });

  it('throws on an invalid NODE_ENV', () => {
    expect(() => parseEnv({ NODE_ENV: 'nope' } as NodeJS.ProcessEnv)).toThrow(
      /Invalid environment/,
    );
  });
});

describe('ConfigService', () => {
  it('returns typed values', () => {
    const svc = new ConfigService({ NODE_ENV: 'test', PORT: 3001 });
    expect(svc.get('NODE_ENV')).toBe('test');
    expect(svc.get('PORT')).toBe(3001);
  });
});