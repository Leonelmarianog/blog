import { createClient } from 'redis';
import type { ConfigService } from '../../config/config.service';
import type { RedisClient } from './redis.client';

export const CACHE_REDIS = Symbol('CACHE_REDIS');

/** Redis db index for the cache namespace. */
export const CACHE_DB = 1;

/**
 * Builds a node-redis client for the cache namespace (db1). Does NOT connect or SELECT here —
 * `CacheRedisLifecycle` (in `RedisModule`) connects and runs `SELECT 1` in `onModuleInit`.
 */
export function createCacheClient(config: ConfigService): RedisClient {
  return createClient({ url: config.get('REDIS_URL') });
}
