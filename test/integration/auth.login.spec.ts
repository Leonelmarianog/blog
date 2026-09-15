import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';
import { assertHtml } from './helpers/html';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

describe('POST /login', () => {
  it('logs in and persists the session across requests (regenerate race fix)', async () => {
    const u = await getSeed().user({ email: 'ok@example.com', password: 'Password123!', emailVerified: true });

    const res = await formPost(getAgent(), '/login', { email: u.email, password: u.password });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/profile');

    // The follow-up must see the authenticated session — guards the establishSession race.
    const profile = await getAgent().get('/profile').expect(200);
    expect(profile.text).toContain(u.email);
  });

  it('re-renders the form with an error on wrong password', async () => {
    const u = await getSeed().user({ email: 'wrong@example.com', password: 'Password123!', emailVerified: true });
    const res = await formPost(getAgent(), '/login', { email: u.email, password: 'WrongPassword!' });
    expect(res.status).toBe(200);
    assertHtml(res.text).contains('Invalid credentials');
  });

  it('refuses a suspended account with an error', async () => {
    const u = await getSeed().user({ email: 'suspended@example.com', password: 'Password123!', status: 'SUSPENDED' });
    const res = await formPost(getAgent(), '/login', { email: u.email, password: u.password });
    expect(res.status).toBe(200);
    assertHtml(res.text).contains('Account suspended');
  });

  it('refuses an unverified account with an error', async () => {
    const u = await getSeed().user({ email: 'unverified@example.com', password: 'Password123!', emailVerified: false });
    const res = await formPost(getAgent(), '/login', { email: u.email, password: u.password });
    expect(res.status).toBe(200);
    assertHtml(res.text).contains('Email not verified');
  });

  it('sets a remember-me cookie and creates a Session row when rememberMe is checked', async () => {
    const u = await getSeed().user({ email: 'rm@example.com', password: 'Password123!', emailVerified: true });
    const res = await formPost(getAgent(), '/login', { email: u.email, password: u.password, rememberMe: '1' });
    expect(res.status).toBe(302);
    const setCookie = res.headers['set-cookie'];
    const rmCookie = (Array.isArray(setCookie) ? setCookie : [setCookie]).find((c) => c?.startsWith('rm='));
    expect(rmCookie).toBeDefined();

    const prisma = getApp().get(PrismaService);
    const sessions = await prisma.session.findMany({ where: { userId: u.id } });
    expect(sessions.length).toBe(1);
  });
});
