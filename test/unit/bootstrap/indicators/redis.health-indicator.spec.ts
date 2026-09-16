import { RedisHealthIndicator } from '@bootstrap/health/indicators/redis.health-indicator';

describe('RedisHealthIndicator', () => {
  it('reports up when ping returns PONG', async () => {
    const client = { ping: jest.fn().mockResolvedValue('PONG') } as unknown as { ping: jest.Mock };
    const indicator = new RedisHealthIndicator(client as never);
    await expect(indicator.check('redis')).resolves.toEqual({ redis: { status: 'up' } });
    expect(client.ping).toHaveBeenCalled();
  });

  it('reports down when ping throws', async () => {
    const client = { ping: jest.fn().mockRejectedValue(new Error('timeout')) } as unknown as { ping: jest.Mock };
    const indicator = new RedisHealthIndicator(client as never);
    const result = await indicator.check('redis');
    expect(result.redis.status).toBe('down');
    expect(result.redis.message).toBe('timeout');
  });
});
