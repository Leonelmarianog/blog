import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

type StartedPg = Awaited<ReturnType<PostgreSqlContainer['start']>>;
type StartedRedis = Awaited<ReturnType<RedisContainer['start']>>;

let pg: StartedPg | undefined;
let redis: StartedRedis | undefined;

/**
 * Start one Postgres + one Redis container (matching docker/docker-compose.yml images)
 * and publish their URLs to process.env. jest runs globalSetup in the main process before
 * spawning workers, so workers inherit these env values; test/setup-env.ts uses `??`
 * defaults, so the container URLs win.
 */
export async function startContainers(): Promise<void> {
  pg = await new PostgreSqlContainer('postgres:17-alpine').start();
  redis = await new RedisContainer('redis:7-alpine').start();
  process.env.DATABASE_URL = pg.getConnectionUri();
  process.env.REDIS_URL = redis.getConnectionUrl();
}

/**
 * Stop both containers. Called from globalTeardown (same process/module registry as
 * globalSetup, so the module-level handles are still in scope).
 */
export async function stopContainers(): Promise<void> {
  await redis?.stop();
  await pg?.stop();
}
