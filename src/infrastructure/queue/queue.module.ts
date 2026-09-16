import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_PRODUCER } from '@contexts/iam/application/ports/queue-producer.port';
import { ConfigService } from '../../config/config.service';
import { QUEUE_REDIS, createQueueRedis, type QueueRedisClient } from './queue-redis.client';
import { BullMQQueueProducer } from './bullmq-queue-producer';

// Re-exported so WorkerModule can @InjectQueue('mail') without re-registering.
const mailQueue = BullModule.registerQueue({
  name: 'mail',
  defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } }, // R11
});

/**
 * Disconnects the db3 ioredis client on app/module teardown so `app.close()` (integration
 * harness) and `moduleRef.close()` (unit `app.spec.ts`) release the handle — otherwise Jest
 * hangs on the open connection. Mirrors the node-redis lifecycle providers in `RedisModule`.
 */
@Injectable()
class QueueRedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(QUEUE_REDIS) private readonly client: QueueRedisClient) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => {});
  }
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [QUEUE_REDIS],
      useFactory: (client: QueueRedisClient) => ({ connection: client }),
    }),
    mailQueue,
  ],
  providers: [
    { provide: QUEUE_REDIS, inject: [ConfigService], useFactory: createQueueRedis },
    QueueRedisLifecycle,
    { provide: QUEUE_PRODUCER, useClass: BullMQQueueProducer },
  ],
  // QUEUE_REDIS is exported so BullModule.forRootAsync's inject (resolved against the global
  // scope, like ConfigService) can see it; QueueRedisLifecycle tears it down on destroy.
  exports: [QUEUE_PRODUCER, mailQueue, QUEUE_REDIS],
})
export class QueueModule {}
