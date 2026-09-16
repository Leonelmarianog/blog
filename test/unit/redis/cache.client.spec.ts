import { createCacheClient } from '@infra/redis/cache.client';
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

describe('createCacheClient', () => {
  it('builds a client configured with REDIS_URL', () => {
    const client = createCacheClient(fakeConfig('redis://example:6390')) as unknown as { options: { url: string } };
    expect(client.options.url).toBe('redis://example:6390');
  });
});
