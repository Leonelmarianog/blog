import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type {
  QueueProducerPort,
  VerificationEmailPayload,
  ResetEmailPayload,
} from '@contexts/iam/application/ports/queue-producer.port';

/**
 * Real BullMQ producer. `queue.add` resolves once Redis acknowledges the job is persisted;
 * a db3-down rejection propagates through `uow.run()` → the DB write rolls back (fail-loud,
 * R4). Job name = the BullMQ job name; data = the payload verbatim (no `type` field, R3).
 */
@Injectable()
export class BullMQQueueProducer implements QueueProducerPort {
  constructor(@InjectQueue('mail') private readonly queue: Queue) {}

  async enqueueVerificationEmail(p: VerificationEmailPayload): Promise<void> {
    await this.queue.add('verification', p);
  }

  async enqueueResetEmail(p: ResetEmailPayload): Promise<void> {
    await this.queue.add('reset', p);
  }
}
