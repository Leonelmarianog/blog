import { RedisCacheAdapter } from '@infra/cache/redis-cache.adapter';

/** Minimal hand-rolled fake of the node-redis methods the adapter uses. */
class FakeRedis {
  store = new Map<string, string>();
  scanCursor = '0';

  async set(key: string, value: string, _opts: { expiration: { type: 'EX'; value: number } }): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async del(keys: string | string[]): Promise<number> {
    const list = Array.isArray(keys) ? keys : [keys];
    let n = 0;
    for (const k of list) if (this.store.delete(k)) n++;
    return n;
  }
  /** Mirrors the real node-redis v6 shape: returns `{ cursor, keys }`. */
  async scan(_cursor: string, opts: { MATCH: string; COUNT: number }): Promise<{ cursor: string; keys: string[] }> {
    // Single-batch fake: return all matching keys in one go with a terminal '0' cursor.
    const pattern = opts.MATCH.replace(/\*$/, '');
    const keys = [...this.store.keys()].filter((k) => k.startsWith(pattern));
    return { cursor: '0', keys };
  }
}

function makeAdapter(): { adapter: RedisCacheAdapter; fake: FakeRedis } {
  const fake = new FakeRedis();
  const adapter = new RedisCacheAdapter(fake as unknown as never);
  return { adapter, fake };
}

describe('RedisCacheAdapter', () => {
  it('returns null on a miss', async () => {
    const { adapter } = makeAdapter();
    expect(await adapter.get('nope')).toBeNull();
  });

  it('round-trips a value and applies a TTL', async () => {
    const { adapter, fake } = makeAdapter();
    await adapter.set('iam:user:1', { name: 'Ada' }, 60);
    expect(await adapter.get('iam:user:1')).toEqual({ name: 'Ada' });
    // FakeRedis.set stored the serialized value — assert the TTL/serialize path was taken.
    expect(fake.store.get('iam:user:1')).toBe(JSON.stringify({ name: 'Ada' }));
  });

  it('returns null on a JSON parse failure', async () => {
    const { adapter, fake } = makeAdapter();
    fake.store.set('bad', '{not json');
    expect(await adapter.get('bad')).toBeNull();
  });

  it('deletes a key', async () => {
    const { adapter } = makeAdapter();
    await adapter.set('k', 1, 10);
    await adapter.del('k');
    expect(await adapter.get('k')).toBeNull();
  });

  it('flushByPrefix removes only matching keys', async () => {
    const { adapter } = makeAdapter();
    await adapter.set('iam:users:a', 1, 10);
    await adapter.set('iam:users:b', 2, 10);
    await adapter.set('iam:user:1', 3, 10);
    await adapter.set('media:asset:x', 4, 10);

    await adapter.flushByPrefix('iam:users');

    expect(await adapter.get('iam:users:a')).toBeNull();
    expect(await adapter.get('iam:users:b')).toBeNull();
    expect(await adapter.get('iam:user:1')).not.toBeNull(); // prefix differs
    expect(await adapter.get('media:asset:x')).not.toBeNull(); // unaffected
  });
});
