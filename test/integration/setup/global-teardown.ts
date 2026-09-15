import { stopContainers } from './containers';

export default async function (): Promise<void> {
  // The fire-and-forget Redis client created in `createSessionMiddleware` (and the harness
  // `flushdb` helper's lazy client) are NOT closed by `app.close()` — spec §4 carry-forward,
  // deferred to a later plan. Under `--runInBand` they share this process, so stopping the
  // Redis container here makes their sockets emit an 'error' event with no listener, which
  // Node treats as an uncaughtException and crashes the process with a non-zero exit — even
  // though every test passed. Attach a scoped handler AFTER all tests have finished (jest
  // runs globalTeardown last, so this cannot mask a test failure) that swallows only Redis
  // socket-close errors, so the suite can exit clean. Non-Redis errors are still fatal.
  process.on('uncaughtException', (err: Error) => {
    if (/Socket closed unexpectedly|ECONNRESET|Connection terminated|Redis socket/i.test(err?.message ?? '')) {
      return;
    }
     
    console.error('uncaughtException during integration teardown:', err);
    process.exitCode = 1;
  });

  await stopContainers();
}
