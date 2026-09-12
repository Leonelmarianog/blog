import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;

/** Lazily connect one Redis client (on the container URL) and reuse it for FLUSHDB. */
export async function flushdb(): Promise<void> {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
    await client.connect();
  }
  await client.flushDb();
}
