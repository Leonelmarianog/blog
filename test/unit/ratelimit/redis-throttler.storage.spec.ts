import { RedisThrottlerStorage } from '@infra/ratelimit/redis-throttler.storage';

/**
 * Fake redis whose `eval` reimplements the storage Lua script's intent in JS so the unit test
 * exercises the storage's mapping logic (totalHits/isBlocked/timeToExpire) without a Lua engine.
 * The real Lua script runs in the integration suite.
 */
class FakeRedis {
  private counts = new Map<string, number>();
  /** Mirrors the real node-redis v6 call shape: `eval(script, { keys, arguments })`. */
  async eval(
    _script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<[number, number]> {
    const key = options.keys[0];
    const ttl = Number(options.arguments[0]);
    const current = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, current);
    // The Lua script returns {current, ttl}; the storage maps both into the record.
    return [current, ttl];
  }
}

function makeStorage(): RedisThrottlerStorage {
  return new RedisThrottlerStorage(new FakeRedis() as unknown as never);
}

describe('RedisThrottlerStorage.increment', () => {
  it('counts hits and reports the ttl as timeToExpire/timeToBlockExpire', async () => {
    const storage = makeStorage();
    const r1 = await storage.increment('k', 900, 10, 0, 'login-ip');
    expect(r1.totalHits).toBe(1);
    expect(r1.isBlocked).toBe(false);
    expect(r1.timeToExpire).toBe(900);
    expect(r1.timeToBlockExpire).toBe(900);
  });

  it('blocks once totalHits exceeds the limit (N pass, N+1 blocked)', async () => {
    const storage = makeStorage();
    for (let i = 1; i <= 10; i++) {
      const r = await storage.increment('k', 900, 10, 0, 'login-ip');
      expect(r.isBlocked).toBe(false);
    }
    const r11 = await storage.increment('k', 900, 10, 0, 'login-ip');
    expect(r11.totalHits).toBe(11);
    expect(r11.isBlocked).toBe(true);
  });

  it('tracks throttlers independently by key', async () => {
    const storage = makeStorage();
    await storage.increment('a', 60, 5, 0, 'default');
    const b = await storage.increment('b', 60, 5, 0, 'default');
    expect(b.totalHits).toBe(1);
  });
});
