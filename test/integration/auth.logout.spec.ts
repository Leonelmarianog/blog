import { useHarness } from './helpers/harness';
import { formPost, formPostUrls } from './helpers/csrf';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

async function login(agent: ReturnType<typeof getAgent>, email: string, password: string): Promise<void> {
  const res = await formPost(agent, '/login', { email, password });
  expect(res.status).toBe(302);
}

/**
 * Logout is a POST-only route (no @Get('logout')), so we cannot mint the CSRF token
 * from GET /logout like formPost does. The logout form is rendered on GET /profile,
 * so mint the session-bound token there, then POST to /logout.
 */
async function logout(agent: ReturnType<typeof getAgent>) {
  return formPostUrls(agent, '/profile', '/logout', {});
}

describe('POST /logout', () => {
  it('clears the session and redirects to /', async () => {
    const u = await getSeed().user({ email: 'out@example.com', password: 'Password123!', emailVerified: true });
    const agent = getAgent();
    await login(agent, u.email, u.password);

    const res = await logout(agent);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');

    // Session no longer authenticates — /profile bounces to /login.
    const profile = await agent.get('/profile');
    expect(profile.status).toBe(302);
    expect(profile.headers.location).toBe('/login');
  });

  it('removes the remember-me Session row when logging out with an rm cookie', async () => {
    const u = await getSeed().user({ email: 'rm-out@example.com', password: 'Password123!', emailVerified: true });
    const agent = getAgent();
    const loginRes = await formPost(agent, '/login', { email: u.email, password: u.password, rememberMe: '1' });
    expect(loginRes.status).toBe(302);
    const prisma = getApp().get(PrismaService);
    expect((await prisma.session.findMany({ where: { userId: u.id } })).length).toBe(1);

    const outRes = await logout(agent);
    expect(outRes.status).toBe(302);
    expect((await prisma.session.findMany({ where: { userId: u.id } })).length).toBe(0);
  });
});
