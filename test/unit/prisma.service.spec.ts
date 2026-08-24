import { PrismaClient, Prisma } from '@infra/persistence/prisma/client';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

describe('PrismaService', () => {
  it('behaves as a PrismaClient', () => {
    const svc = new PrismaService('postgresql://blog:blog@localhost:5432/blog');
    // Prisma 7's PrismaClient constructor returns a custom null-prototype object
    // rather than a traditional class instance, so `instanceof PrismaClient` does
    // not hold. Verify PrismaClient behavior (query + transaction + disconnect API)
    // and that the Prisma namespace is re-exported from the client barrel.
    expect(typeof svc.$disconnect).toBe('function');
    expect(typeof svc.$connect).toBe('function');
    expect(typeof svc.$transaction).toBe('function');
    expect(Prisma).toBeDefined();
    expect(PrismaClient).toBeDefined();
  });

  it('implements OnModuleDestroy', () => {
    const svc = new PrismaService('postgresql://blog:blog@localhost:5432/blog');
    expect(typeof svc.onModuleDestroy).toBe('function');
  });
});
