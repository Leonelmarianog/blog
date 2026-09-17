import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { GenericContainer, Wait } from 'testcontainers';
import path from 'node:path';

type StartedPg = Awaited<ReturnType<PostgreSqlContainer['start']>>;
type StartedRedis = Awaited<ReturnType<RedisContainer['start']>>;
type StartedGarage = Awaited<ReturnType<GenericContainer['start']>>;
type StartedMailpit = Awaited<ReturnType<GenericContainer['start']>>;

let pg: StartedPg | undefined;
let redis: StartedRedis | undefined;
let garage: StartedGarage | undefined;
let mailpit: StartedMailpit | undefined;

const GARAGE_TOML = path.resolve('docker/garage/garage.toml');
const CONF = '/etc/garage/garage.toml';
const BUCKET = 'blog-media';
const KEY_NAME = 'blog-app';

/** Run a `garage` CLI command inside the container. The image is distroless (only the
 * `/garage` binary, no shell), so every command runs the binary directly via exec. */
async function gc(...args: string[]): Promise<{ stdout: string; exitCode: number }> {
  const res = await garage!.exec(['/garage', '-c', CONF, ...args]);
  return { stdout: res.stdout, exitCode: res.exitCode };
}

/** Resolve when `pred` returns true, else throw after `timeoutMs`. */
async function poll(label: string, pred: () => Promise<boolean>, timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await pred()) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

/**
 * Start Postgres + Redis + Garage (S3-compatible). Garage is provisioned by running the
 * `/garage` binary directly via exec (the image is distroless — no shell): wait for the
 * control RPC, bootstrap the v2.x cluster layout (a fresh node has no role, so bucket/key
 * ops would otherwise fail with "Layout not ready"), then create the bucket + an access
 * key and grant it read+write. The access key id + secret are captured from `key create`
 * output (shown once; `key info` redacts the secret) and published to `process.env` with
 * the mapped S3 port so the app's S3StorageAdapter and the storage test helper connect.
 */
export async function startContainers(): Promise<void> {
  pg = await new PostgreSqlContainer('postgres:17-alpine').start();
  redis = await new RedisContainer('redis:7-alpine').start();
  process.env.DATABASE_URL = pg.getConnectionUri();
  process.env.REDIS_URL = redis.getConnectionUrl();

  garage = await new GenericContainer('dxflrs/garage:v2.3.0')
    .withCommand(['/garage', '-c', CONF, 'server'])
    .withExposedPorts(3900, 3901)
    .withCopyFilesToContainer([{ source: GARAGE_TOML, target: CONF }])
    // `Wait.forListeningPorts()` does not detect Garage's `[::]:3900` bind in this
    // testcontainers version, so wait for the S3 API "listening" log line instead —
    // by then the control RPC (3901) is up too.
    .withWaitStrategy(Wait.forLogMessage(/S3 API server listening/, 1))
    .start();

  // Wait for the control RPC to answer.
  await poll('garage rpc', async () => (await gc('status')).exitCode === 0);

  // v2.x starts a fresh node with NO cluster layout; bucket/key ops return
  // "Layout not ready" until we assign this node a role and apply version 1.
  const status = (await gc('status')).stdout;
  const node = status.match(/^[0-9a-f]{16,}\s/im)?.[0]?.trim();
  if (!node) throw new Error('could not parse garage node id from `garage status`');
  await gc('layout', 'assign', '-z', 'dc1', '-c', '1G', node);
  await gc('layout', 'apply', '--version', '1');
  await poll('garage layout', async () => (await gc('bucket', 'list')).exitCode === 0);

  // Bucket + access key. The testcontainer volume is ephemeral, so these are always fresh.
  await gc('bucket', 'create', BUCKET);
  const keyOut = (await gc('key', 'create', KEY_NAME)).stdout;
  const keyId = keyOut.match(/^Key ID:\s*(\S+)/m)?.[1];
  const secret = keyOut.match(/^Secret key:\s*(\S+)/m)?.[1];
  if (!keyId || !secret) throw new Error('could not parse garage access key from `garage key create`');
  await gc('bucket', 'allow', '--read', '--write', BUCKET, '--key', keyId);

  const port = garage.getMappedPort(3900);
  process.env.STORAGE_DRIVER = 's3';
  process.env.S3_ENDPOINT = `http://localhost:${port}`;
  process.env.S3_REGION = 'garage';
  process.env.S3_BUCKET = BUCKET;
  process.env.S3_ACCESS_KEY_ID = keyId;
  process.env.S3_SECRET_ACCESS_KEY = secret;
  process.env.S3_PUBLIC_BASE = `http://localhost:${port}/${BUCKET}`;
  process.env.S3_FORCE_PATH_STYLE = 'true';

  // Mailpit (fake SMTP + HTTP API). The SMTP port (1025) receives mail from the app's
  // NodemailerMailAdapter; the API port (8025) is queried by helpers/mail.ts. The wait
  // strategy keys on the API listen line so the API is answerable by the time we return.
  mailpit = await new GenericContainer('axllent/mailpit:latest')
    .withExposedPorts(1025, 8025)
    .withWaitStrategy(Wait.forLogMessage(/\[http\] listening on .*8025/, 1))
    .start();
  process.env.MAIL_DRIVER = 'smtp';
  process.env.SMTP_HOST = mailpit.getHost();
  process.env.SMTP_PORT = String(mailpit.getMappedPort(1025));
  process.env.SMTP_SECURE = 'false';
  process.env.MAIL_FROM = 'no-reply@blog.test';
  process.env.APP_URL = 'http://app.test'; // deterministic link prefix for assertions
  process.env.MAILPIT_API_URL = `http://${mailpit.getHost()}:${mailpit.getMappedPort(8025)}`;
}

/**
 * Stop all three containers. Called from globalTeardown (same process/module registry as
 * globalSetup, so the module-level handles are still in scope).
 */
export async function stopContainers(): Promise<void> {
  await mailpit?.stop();
  await garage?.stop();
  await redis?.stop();
  await pg?.stop();
}
