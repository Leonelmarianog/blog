import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { flushdb } from './redis';

/**
 * Per-test reset: delete rows in FK-safe order (sessions + tokens before users),
 * then flush Redis (session store). A fresh supertest.agent is created per test by
 * the harness for cookie isolation.
 */
export async function resetState(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$transaction([
    prisma.session.deleteMany(),
    prisma.token.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  await flushdb();
}
