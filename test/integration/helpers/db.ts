import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { flushAllDbs } from './redis';
import { deletePrefix } from './storage';

/**
 * Per-test reset: delete rows in FK-safe order (variants + sessions + tokens before
 * users, then assets), flush every Redis db (session store db0, cache db1, throttle db2),
 * and empty the storage bucket's assets/ prefix so uploaded objects don't leak between
 * tests. A fresh supertest.agent is created per test by the harness for cookie isolation.
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
  await flushAllDbs();
  await deletePrefix('assets/');
}
