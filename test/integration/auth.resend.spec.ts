import { useHarness } from './helpers/harness';
import { formPostUrls } from './helpers/csrf';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

// GET /resend-verification renders iam/verify-email.hbs — a static message with NO
// form/CSRF partial. The CSRF token is session-scoped (minted once in req.session.csrfToken,
// reused across all forms — see csrf.middleware.ts), so mint it from GET /login (which
// renders {{> csrf}}) and POST to /resend-verification in the same session. Same pattern as
// the /logout spec (Task 6).
describe('POST /resend-verification', () => {
  it('creates a new VERIFICATION token for an unverified user', async () => {
    const u = await getSeed().user({ email: 'resend@example.com', emailVerified: false });
    const res = await formPostUrls(getAgent(), '/login', '/resend-verification', { email: u.email });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    const prisma = getApp().get(PrismaService);
    expect((await prisma.token.findMany({ where: { userId: u.id, type: 'VERIFICATION' } })).length).toBe(1);
  });

  it('creates no token for an already-verified user (same redirect, no leak)', async () => {
    const u = await getSeed().user({ email: 'verified@example.com', emailVerified: true });
    const res = await formPostUrls(getAgent(), '/login', '/resend-verification', { email: u.email });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
    const prisma = getApp().get(PrismaService);
    expect(await prisma.token.count()).toBe(0);
  });
});
