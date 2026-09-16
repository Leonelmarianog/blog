import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { bootApp, closeApp, type BootOptions } from './app';
import { resetState } from './db';
import { makeSeed, type Seed } from './factories';

export type HarnessOptions = BootOptions;

let app: INestApplication;
let agent: supertest.Agent;
let seed: Seed;

/**
 * Registers jest hooks for one integration spec file: boots createApp() in beforeAll,
 * closes in afterAll, and resets DB + Redis + the supertest agent per test. Returns
 * getters the spec reads inside `it` blocks (after beforeAll has populated them).
 * Opts thread through to `createApp` (e.g. a `pinoDestination` collecting stream for
 * logging assertions); the default boots quietly (pino silent in test).
 */
export function useHarness(opts: HarnessOptions = {}) {
  beforeAll(async () => {
    app = await bootApp(opts);
    seed = makeSeed(app);
  });

  afterAll(async () => {
    await closeApp(app);
  });

  beforeEach(async () => {
    await resetState(app);
    agent = supertest.agent(app.getHttpServer());
  });

  return {
    getApp: (): INestApplication => app,
    getAgent: (): supertest.Agent => agent,
    getSeed: (): Seed => seed,
  };
}
