import { Client } from 'pg';
import { createClient } from 'redis';

describe('integration harness containers', () => {
  it('started Postgres and ran migrations (User table exists, empty)', async () => {
    expect(process.env.DATABASE_URL).toMatch(/postgres/);
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM "User"');
      expect(rows[0].c).toBe(0);
    } finally {
      await client.end();
    }
  });

  it('started Redis (PING)', async () => {
    expect(process.env.REDIS_URL).toMatch(/redis/);
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    try {
      expect(await client.ping()).toBe('PONG');
    } finally {
      await client.disconnect();
    }
  });
});
