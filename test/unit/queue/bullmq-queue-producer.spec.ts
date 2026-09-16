import type { Queue } from 'bullmq';
import { BullMQQueueProducer } from '@infra/queue/bullmq-queue-producer';
import type { VerificationEmailPayload, ResetEmailPayload } from '@contexts/iam/application/ports/queue-producer.port';

function fakeQueue(addImpl?: (name: string, data: unknown) => Promise<void>): Queue {
  return { add: jest.fn(addImpl ?? (() => Promise.resolve())) } as unknown as Queue;
}

const verifyPayload: VerificationEmailPayload = {
  userId: 'u1', to: 'a@b.com', tokenSelector: 'sel', tokenVerifier: 'ver',
};
const resetPayload: ResetEmailPayload = {
  userId: 'u1', to: 'a@b.com', tokenSelector: 'rsel', tokenVerifier: 'rver',
};

describe('BullMQQueueProducer', () => {
  it('adds a verification job with name "verification" and the payload verbatim', async () => {
    const queue = fakeQueue();
    const producer = new BullMQQueueProducer(queue);
    await producer.enqueueVerificationEmail(verifyPayload);
    expect(queue.add).toHaveBeenCalledWith('verification', verifyPayload);
  });

  it('adds a reset job with name "reset" and the payload verbatim', async () => {
    const queue = fakeQueue();
    const producer = new BullMQQueueProducer(queue);
    await producer.enqueueResetEmail(resetPayload);
    expect(queue.add).toHaveBeenCalledWith('reset', resetPayload);
  });

  it('propagates a queue.add rejection (fail-loud inside the UoW)', async () => {
    const queue = fakeQueue(() => Promise.reject(new Error('redis db3 down')));
    const producer = new BullMQQueueProducer(queue);
    await expect(producer.enqueueVerificationEmail(verifyPayload)).rejects.toThrow('redis db3 down');
  });
});
