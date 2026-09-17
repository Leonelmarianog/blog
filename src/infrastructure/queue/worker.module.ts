import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { LoggerModule } from '../../bootstrap/logging/logger.module';
import { QueueModule } from './queue.module';
import { MailerModule } from '../mailer/mailer.module';
import { MailProcessor } from './mail.processor';

/**
 * Root module for the worker process (`src/worker.ts`). Hosts the BullMQ `@Processor`
 * (MailProcessor) + the mailer. ConfigModule/QueueModule/MailerModule are @Global, but the
 * worker is its own composition root so each is imported explicitly. LoggerModule is NOT
 * global, so it must be imported here for `app.useLogger(app.get(Logger))` to route Nest
 * bootstrap logs through pino. No HTTP listener — `app.init()` registers the @Processor and
 * starts the BullMQ worker via @nestjs/bullmq's OnModuleInit.
 */
@Module({
  imports: [ConfigModule, LoggerModule.forRoot(), QueueModule, MailerModule],
  providers: [MailProcessor],
})
export class WorkerModule {}
