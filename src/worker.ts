import 'dotenv/config'; // Load .env into process.env before ConfigModule parses it
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './infrastructure/queue/worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  // No HTTP listener: init() registers the @Processor and starts the BullMQ worker.
  await app.init();
  logger.log('mail worker started — processing db3 mail queue');
  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
void bootstrap();
