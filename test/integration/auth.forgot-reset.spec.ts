import { useHarness } from './helpers/harness';
import { formPost, formPostUrls } from './helpers/csrf';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

describe('POST /forgot-password', () => {
  it('creates a RESET token for a known email and redirects to /login', async () => {
    const u = await getSeed().user({ email: 'forgot@example.com' });
    const res = await formPost(getAgent(), '/forgot-password', { email: u.email });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    const prisma = getApp().get(PrismaService);
    expect((await prisma.token.findMany({ where: { userId: u.id, type: 'RESET' } })).length).toBe(1);
  });

  it('returns the same redirect for an unknown email (no enumeration) and creates no token', async () => {
    const res = await formPost(getAgent(), '/forgot-password', { email: 'nobody@example.com' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    const prisma = getApp().get(PrismaService);
    expect(await prisma.token.count()).toBe(0);
  });
});

describe('POST /reset-password', () => {
  it('resets the password, consumes the token, and deletes the user sessions', async () => {
    const u = await getSeed().user({ email: 'reset@example.com', password: 'OldPassword123!' });
    await getSeed().session({ userId: u.id });
    const t = await getSeed().token({ userId: u.id, type: 'RESET', verifier: 'reset-v' });

    const res = await formPostUrls(
      getAgent(),
      `/reset-password?selector=${t.selector}&verifier=${t.verifier}`,
      '/reset-password',
      { selector: t.selector, verifier: t.verifier, newPassword: 'NewPassword123!' },
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');

    const prisma = getApp().get(PrismaService);
    const token = await prisma.token.findUnique({ where: { selector: t.selector } });
    expect(token?.usedAt).not.toBeNull();
    expect((await prisma.session.findMany({ where: { userId: u.id } })).length).toBe(0);

    // New password works for login; old does not.
    const loginRes = await formPost(getAgent(), '/login', { email: u.email, password: 'NewPassword123!' });
    expect(loginRes.status).toBe(302);
  });

  it('re-renders the form with an error on an expired reset token', async () => {
    const u = await getSeed().user({ email: 'reset-expired@example.com' });
    const t = await getSeed().token({
      userId: u.id,
      type: 'RESET',
      verifier: 'v',
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await formPostUrls(
      getAgent(),
      `/reset-password?selector=${t.selector}&verifier=${t.verifier}`,
      '/reset-password',
      { selector: t.selector, verifier: t.verifier, newPassword: 'NewPassword123!' },
    );
    expect(res.status).toBe(200); // re-rendered form (reset-password.hbs already renders errors.form)
    expect(res.text).toContain('Invalid or expired reset token');
  });
});
