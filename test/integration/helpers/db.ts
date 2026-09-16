import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { flushdb } from './redis';
import { deletePrefix } from './storage';

/**
 * Per-test reset: delete rows in FK-safe order (variants + sessions + tokens before
 * users, then assets), flush Redis (session store), and empty the storage bucket's
 * assets/ prefix so uploaded objects don't leak between tests. A fresh supertest.agent
 * is created per test by the harness for cookie isolation.
 */
export async function resetState(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.$transaction([
    prisma.assetVariant.deleteMany(),
    prisma.session.deleteMany(),
    prisma.token.deleteMany(),
    prisma.user.deleteMany(),
    prisma.asset.deleteMany(),
  ]);
  await flushdb();
  await deletePrefix('assets/');
}
