import type { INestApplication } from '@nestjs/common';
import { createApp } from '../../../src/create-app';

export async function bootApp(): Promise<INestApplication> {
  return createApp();
}

export async function closeApp(app: INestApplication): Promise<void> {
  await app.close();
}
