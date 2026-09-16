import { createRedisClient } from '@infra/redis/redis.client';
import { parseEnv } from '../../../src/config/env';
import { ConfigService } from '../../../src/config/config.service';

function fakeConfig(url = 'redis://localhost:6379'): ConfigService {
  return new ConfigService(parseEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://blog:blog@localhost:5432/blog',
    SESSION_SECRET: 'a-very-long-session-secret',
    REDIS_URL: url,
  } as NodeJS.ProcessEnv));
}

describe('createRedisClient', () => {
  it('builds a client configured with REDIS_URL', () => {
    const client = createRedisClient(fakeConfig('redis://example:6390')) as unknown as { options: { url: string } };
    expect(client.options.url).toBe('redis://example:6390');
  });

  it('exposes a ping function on the client', () => {
    const client = createRedisClient(fakeConfig()) as unknown as { ping: unknown };
    expect(typeof client.ping).toBe('function');
  });
});
