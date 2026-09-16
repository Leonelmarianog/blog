import { Inject, Injectable } from '@nestjs/common';
import { type ThrottlerStorage } from '@nestjs/throttler';
import { THROTTLE_REDIS } from '../redis/throttle.client';
import type { RedisClient } from '../redis/redis.client';

/**
 * Atomic INCR + EXPIRE-on-first-hit via a single Lua script. `blockDuration` is accepted but
 * unused: once `totalHits > limit` within the TTL window the request is rejected until the key
 * expires (no separate block window). `timeToBlockExpire` is set to `timeToExpire` (= ttl) so the
 * base guard emits a meaningful `Retry-After-<name>` header, which the `ThrottlerExceptionFilter`
 * forwards as `Retry-After`.
 *
 * Note: `this.redis.eval` is the node-redis **EVAL** command — it sends a Lua script to Redis to
 * run server-side. It is NOT the JS `eval()` and executes no local code.
 */
const INCREMENT_SCRIPT = `local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return {current, ARGV[1], 0, -1}`;

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(@Inject(THROTTLE_REDIS) private readonly redis: RedisClient) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    _blockDuration: number,
    _throttlerName: string,
  ) {
    const result = await this.redis.eval(INCREMENT_SCRIPT, {
      keys: [key],
      arguments: [String(ttl)],
    }) as unknown[];
    const totalHits = Number(result[0]);
    const isBlocked = totalHits > limit;
    return { totalHits, timeToExpire: ttl, isBlocked, timeToBlockExpire: ttl };
  }
}
