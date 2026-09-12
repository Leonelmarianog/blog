import { Client } from 'pg';
import { createClient } from 'redis';

describe('integration harness containers', () => {
  it('started Postgres and ran migrations (User table exists and is queryable)', async () => {
    expect(process.env.DATABASE_URL).toMatch(/postgres/);
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      // The point is that migration 0001 created the "User" table — i.e. the COUNT query
      // succeeds. Asserting exactly 0 is fragile under --runInBand: other spec files share
      // this one container and may seed users before/after this spec runs, so the count is
      // not guaranteed to be 0. Queryability (a non-negative integer) proves the schema.
      const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM "User"');
      expect(rows[0].c).toBeGreaterThanOrEqual(0);
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
