import { PrismaHealthIndicator } from '@bootstrap/health/indicators/prisma.health-indicator';

describe('PrismaHealthIndicator', () => {
  it('reports up when SELECT 1 succeeds', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as never;
    const indicator = new PrismaHealthIndicator(prisma);
    await expect(indicator.check('database')).resolves.toEqual({ database: { status: 'up' } });
  });

  it('reports down with a message when the query throws', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('connection refused')) } as never;
    const indicator = new PrismaHealthIndicator(prisma);
    const result = await indicator.check('database');
    expect(result.database.status).toBe('down');
    expect(result.database.message).toBe('connection refused');
  });
});
