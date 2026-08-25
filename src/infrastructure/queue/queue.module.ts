import { Global, Module } from '@nestjs/common';
import { QUEUE_PRODUCER } from '@contexts/iam/application/ports/queue-producer.port';
import { LoggingQueueProducer } from './logging-queue-producer';

@Global()
@Module({
  providers: [{ provide: QUEUE_PRODUCER, useClass: LoggingQueueProducer }],
  exports: [QUEUE_PRODUCER],
})
export class QueueModule {}
