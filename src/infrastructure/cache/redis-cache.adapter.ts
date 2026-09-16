import { Inject, Injectable } from '@nestjs/common';
import { CACHE_REDIS } from '../redis/cache.client';
import type { RedisClient } from '../redis/redis.client';
import type { CachePort } from '@kernel/application';

const SCAN_BATCH = 100;

/**
 * Redis-backed `CachePort` on db1. Values are JSON-serialized.
 *
 * **Date limitation:** `JSON.stringify` turns `Date` into an ISO string and `JSON.parse` returns
 * a string, not a `Date`. 7b caches no dates (no consumer yet); future consumers that store
 * dates must (de)serialize them explicitly.
 */
@Injectable()
export class RedisCacheAdapter implements CachePort {
  constructor(@Inject(CACHE_REDIS) private readonly redis: RedisClient) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), { expiration: { type: 'EX', value: ttlSeconds } });
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /** SCAN-cursor loop with `MATCH prefix*`, batching DEL. Never uses `KEYS`. */
  async flushByPrefix(prefix: string): Promise<void> {
    let cursor = '0';
    do {
      const { cursor: next, keys } = await this.redis.scan(cursor, { MATCH: `${prefix}*`, COUNT: SCAN_BATCH });
      if (keys.length > 0) await this.redis.del(keys);
      cursor = next;
    } while (cursor !== '0');
  }
}
