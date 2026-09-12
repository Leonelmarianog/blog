import type { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { bootApp, closeApp } from './app';
import { resetState } from './db';
import { makeSeed, type Seed } from './factories';

let app: INestApplication;
let agent: supertest.Agent;
let seed: Seed;

/**
 * Registers jest hooks for one integration spec file: boots createApp() in beforeAll,
 * closes in afterAll, and resets DB + Redis + the supertest agent per test. Returns
 * getters the spec reads inside `it` blocks (after beforeAll has populated them).
 */
export function useHarness() {
  beforeAll(async () => {
    app = await bootApp();
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
