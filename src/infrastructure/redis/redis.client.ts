import { createClient } from 'redis';
import type { ConfigService } from '../../config/config.service';

export type RedisClient = ReturnType<typeof createClient>;

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Caps node-redis's reconnect attempts. The default strategy retries forever and, critically,
 * never settles the `connect()` promise when Redis is unreachable (it retries internally past
 * `connectTimeout` too) — so `RedisModule`'s `await client.connect().catch(() => {})` would hang
 * `app.init()` and block boot entirely whenever Redis is down. With this cap, `connect()`
 * rejects after a few quick retries and the lifecycle's `.catch()` swallows it (fail-open: cache
 * misses, throttle fails open, the health indicator reports `down`). When Redis IS up — the
 * normal case — the first `connect()` succeeds and no retry ever runs, so steady-state behavior
 * is unchanged. All three clients (db0 health, db1 cache, db2 throttle) are fail-open by design,
 * so a capped reconnect matches their existing contract.
 */
export const bootReconnectStrategy = (retries: number): number | false =>
  retries > 3 ? false : 100;

/**
 * Builds a node-redis client from REDIS_URL. Does NOT connect here — `RedisModule`'s lifecycle
 * provider calls `.connect()` in `onModuleInit` (errors swallowed so the app still boots; the
 * health indicator surfaces a connect failure as `down`).
 */
export function createRedisClient(config: ConfigService): RedisClient {
  return createClient({ url: config.get('REDIS_URL'), socket: { reconnectStrategy: bootReconnectStrategy } });
}
