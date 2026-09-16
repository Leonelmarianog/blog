import { createClient } from 'redis';
import type { ConfigService } from '../../config/config.service';

export type RedisClient = ReturnType<typeof createClient>;

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Builds a node-redis client from REDIS_URL. Does NOT connect here — `RedisModule`'s lifecycle
 * provider calls `.connect()` in `onModuleInit` (errors swallowed so the app still boots; the
 * health indicator surfaces a connect failure as `down`).
 */
export function createRedisClient(config: ConfigService): RedisClient {
  return createClient({ url: config.get('REDIS_URL') });
}
