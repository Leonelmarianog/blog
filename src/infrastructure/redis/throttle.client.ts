import { createClient } from 'redis';
import type { ConfigService } from '../../config/config.service';
import type { RedisClient } from './redis.client';

export const THROTTLE_REDIS = Symbol('THROTTLE_REDIS');

/** Redis db index for the throttle namespace. */
export const THROTTLE_DB = 2;

/**
 * Builds a node-redis client for the throttle namespace (db2). Does NOT connect or SELECT here —
 * `ThrottleRedisLifecycle` (in `RedisModule`) connects and runs `SELECT 2` in `onModuleInit`.
 */
export function createThrottleClient(config: ConfigService): RedisClient {
  return createClient({ url: config.get('REDIS_URL') });
}
