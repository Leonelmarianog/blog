import IORedis from 'ioredis';
import type { ConfigService } from '../../config/config.service';

export const QUEUE_DB = 3; // code constant — mirrors CACHE_DB / THROTTLE_DB

export type QueueRedisClient = IORedis;

export const QUEUE_REDIS = Symbol('QUEUE_REDIS');

/**
 * ioredis client for BullMQ on db3. BullMQ has a hard dependency on ioredis (it does not
 * support node-redis), so this is a deliberate, scoped exception to Plan 7b's "no ioredis"
 * rule — ioredis owns db3 and nothing else; the node-redis clients on db0–2 are untouched.
 *
 * `maxRetriesPerRequest: null` is REQUIRED by BullMQ (it errors loudly otherwise). The
 * `error` listener is swallowed so an unreachable Redis during unit-test module compile
 * (no Redis running) does not crash Node with an unhandled 'error' event — matches the
 * swallow-errors pattern on the node-redis lifecycle clients. BullMQ owns connect/disconnect.
 *
 * `lazyConnect: true` stops ioredis from auto-connecting on construction (its default), which
 * would retry forever against a missing Redis and leak an open handle. BullMQ issues commands
 * lazily; in runtime (web/worker) it triggers the connect on first use. Teardown is owned by
 * `QueueRedisLifecycle.onModuleDestroy()` (`.quit()`), mirroring the node-redis lifecycle
 * providers — without it `moduleRef.close()` leaves the ioredis handle open and Jest hangs.
 */
export function createQueueRedis(config: ConfigService): QueueRedisClient {
  const client = new IORedis(config.get('REDIS_URL'), {
    db: QUEUE_DB,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  client.on('error', () => { /* surfaced via BullMQ logs / failed-jobs set */ });
  return client;
}
