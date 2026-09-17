import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { flushAllDbs } from './redis';
import { deletePrefix } from './storage';
import { clearMailbox } from './mail';

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
  // Mailpit always starts in global setup, so this clears for every integration suite. The
  // `.catch` keeps non-mail runs harmless if Mailpit were ever absent (MAILPIT_API_URL unset).
  await clearMailbox().catch(() => {
    /* no Mailpit container => suite doesn't use mail */
  });
}
