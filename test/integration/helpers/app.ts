import type { INestApplication } from '@nestjs/common';
import type { DestinationStream } from 'pino';
import { createApp } from '../../../src/create-app';

export interface BootOptions {
  pinoDestination?: DestinationStream;
}

export async function bootApp(opts: BootOptions = {}): Promise<INestApplication> {
  return createApp(opts);
}

export async function closeApp(app: INestApplication): Promise<void> {
  await app.close();
}
