import type { INestApplication } from '@nestjs/common';
import { createApp } from '../../src/create-app';

describe('createApp', () => {
  let app: INestApplication;
  it('returns an initialized INestApplication without listening', async () => {
    app = await createApp();
    expect(app).toBeDefined();
    expect(typeof app.getHttpServer).toBe('function');
  });

  afterAll(async () => {
    await app?.close();
  });
});
