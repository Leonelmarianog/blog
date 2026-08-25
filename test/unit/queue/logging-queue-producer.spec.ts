import { LoggingQueueProducer } from '@infra/queue/logging-queue-producer';

describe('LoggingQueueProducer', () => {
  it('logs a verification URL containing selector and verifier', async () => {
    const logs: string[] = [];
    const producer = new LoggingQueueProducer((msg: string) => logs.push(msg));
    await producer.enqueueVerificationEmail({
      userId: 'u1', to: 'a@b.com', tokenSelector: 'sel-123', tokenVerifier: 'ver-456',
    });
    expect(logs.some((l) => l.includes('sel-123') && l.includes('ver-456') && l.includes('/verify-email'))).toBe(true);
  });

  it('logs a reset URL containing selector and verifier', async () => {
    const logs: string[] = [];
    const producer = new LoggingQueueProducer((msg: string) => logs.push(msg));
    await producer.enqueueResetEmail({
      userId: 'u1', to: 'a@b.com', tokenSelector: 'rsel', tokenVerifier: 'rver',
    });
    expect(logs.some((l) => l.includes('rsel') && l.includes('rver') && l.includes('/reset-password'))).toBe(true);
  });
});
