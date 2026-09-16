import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;

/** Lazily connect one Redis client (on the container URL) and reuse it to flush every db. */
export async function flushAllDbs(): Promise<void> {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    await client.connect();
  }
  // FLUSHALL clears every logical db (session store db0, cache db1, throttle db2) so tests start clean.
  await client.flushAll();
}
