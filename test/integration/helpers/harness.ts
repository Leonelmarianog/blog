import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import supertest from 'supertest';
import { bootApp, closeApp, type BootOptions } from './app';
import { resetState } from './db';
import { makeSeed, type Seed } from './factories';
import { WorkerModule } from '@infra/queue/worker.module';

export type HarnessOptions = BootOptions & { withWorker?: boolean };

let app: INestApplication;
let workerApp: INestApplication | undefined;
let agent: supertest.Agent;
let seed: Seed;

/**
 * Registers jest hooks for one integration spec file: boots createApp() (web) in beforeAll,
 * closes in afterAll, and resets DB + Redis + Mailpit + the supertest agent per test. When
 * `withWorker: true` (mail.spec), also boots a WorkerModule in-process against the testcontainer
 * Redis db3 + Mailpit so enqueued jobs are processed end-to-end. The worker boot is opt-in so
 * the other suites don't pay for an idle BullMQ worker + extra ioredis connection.
 */
export function useHarness(opts: HarnessOptions = {}) {
  beforeAll(async () => {
    app = await bootApp(opts);
    seed = makeSeed(app);
    if (opts.withWorker) {
      workerApp = await NestFactory.create(WorkerModule, { bufferLogs: true });
      await workerApp.init();
    }
  });

  afterAll(async () => {
    if (workerApp) await workerApp.close();
    workerApp = undefined;
    await closeApp(app);
  });

  beforeEach(async () => {
    await resetState(app);
    agent = supertest.agent(app.getHttpServer());
  });

  return {
    getApp: (): INestApplication => app,
    getWorkerApp: (): INestApplication | undefined => workerApp,
    getAgent: (): supertest.Agent => agent,
    getSeed: (): Seed => seed,
  };
}
