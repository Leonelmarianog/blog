import { useHarness } from './helpers/harness';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

describe('GET /verify-email', () => {
  it('verifies the email and consumes the token (redirects to /login)', async () => {
    const u = await getSeed().user({ email: 'verify@example.com', emailVerified: false });
    const t = await getSeed().token({ userId: u.id, type: 'VERIFICATION', verifier: 'verifier-secret' });

    const res = await getAgent().get('/verify-email').query({ selector: t.selector, verifier: t.verifier }).expect(302);
    expect(res.headers.location).toBe('/login');

    const prisma = getApp().get(PrismaService);
    const user = await prisma.user.findUnique({ where: { id: u.id } });
    expect(user?.emailVerified).toBe(true);
    const token = await prisma.token.findUnique({ where: { selector: t.selector } });
    expect(token?.usedAt).not.toBeNull();
  });

  it('rejects an expired token (flash error, still redirects to /login)', async () => {
    const u = await getSeed().user({ email: 'expired@example.com', emailVerified: false });
    const t = await getSeed().token({
      userId: u.id,
      type: 'VERIFICATION',
      verifier: 'v',
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await getAgent().get('/verify-email').query({ selector: t.selector, verifier: t.verifier }).expect(302);
    expect(res.headers.location).toBe('/login');
    const prisma = getApp().get(PrismaService);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.emailVerified).toBe(false);
  });

  it('rejects a wrong verifier', async () => {
    const u = await getSeed().user({ email: 'wrong-ver@example.com', emailVerified: false });
    const t = await getSeed().token({ userId: u.id, type: 'VERIFICATION', verifier: 'right' });
    await getAgent().get('/verify-email').query({ selector: t.selector, verifier: 'wrong' }).expect(302);
    const prisma = getApp().get(PrismaService);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.emailVerified).toBe(false);
  });
});
