import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';
import { assertHtml } from './helpers/html';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

describe('POST /register', () => {
  it('creates a user and a VERIFICATION token, then redirects to /login', async () => {
    const res = await formPost(getAgent(), '/register', {
      email: 'new@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');

    const prisma = getApp().get(PrismaService);
    const user = await prisma.user.findUnique({ where: { email: 'new@example.com' } });
    expect(user).not.toBeNull();
    expect(user?.emailVerified).toBe(false);
    expect(user?.role).toBe('READER');

    const tokens = await prisma.token.findMany({ where: { userId: user!.id } });
    expect(tokens.some((t) => t.type === 'VERIFICATION')).toBe(true);
  });

  it('re-renders the form with an error on duplicate email', async () => {
    const existing = await getSeed().user({ email: 'dup@example.com' });
    const res = await formPost(getAgent(), '/register', {
      email: existing.email,
      password: 'Password123!',
    });
    expect(res.status).toBe(200); // re-rendered form, not a redirect
    assertHtml(res.text).contains('Email already registered');
  });

  it('re-renders the form (status 200, not the 400 page) on invalid payload', async () => {
    const res = await formPost(getAgent(), '/register', { email: 'bad', password: 'short' });
    expect(res.status).toBe(200); // ValidationExceptionFilter re-renders @FormView at 200
    // submitted email is echoed back (filter spreads ...req.body)
    expect(res.text).toContain('value="bad"');
  });
});
