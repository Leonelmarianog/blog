import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';

const { getAgent, getSeed, getApp } = useHarness();

async function loginAs(agent: ReturnType<typeof getAgent>, email: string, password: string): Promise<void> {
  const res = await formPost(agent, '/login', { email, password });
  expect(res.status).toBe(302);
}

describe('GET /profile', () => {
  it('redirects to /login when unauthenticated', async () => {
    const res = await getAgent().get('/profile');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('renders the profile for an authenticated user', async () => {
    const u = await getSeed().user({ email: 'me@example.com', password: 'Password123!' });
    const agent = getAgent();
    await loginAs(agent, u.email, u.password);
    const res = await agent.get('/profile').expect(200);
    expect(res.text).toContain(u.email);
  });
});

describe('POST /profile/edit', () => {
  it('updates the display name and redirects to /profile', async () => {
    const u = await getSeed().user({ email: 'edit@example.com', password: 'Password123!' });
    const agent = getAgent();
    await loginAs(agent, u.email, u.password);
    const res = await formPost(agent, '/profile/edit', { displayName: 'New Display' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/profile');
    const prisma = getApp().get(PrismaService);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.displayName).toBe('New Display');
  });

  it('changes the password when newPassword is supplied', async () => {
    const u = await getSeed().user({ email: 'pw@example.com', password: 'Password123!' });
    const agent = getAgent();
    await loginAs(agent, u.email, u.password);
    const editRes = await formPost(agent, '/profile/edit', { displayName: 'Test User', newPassword: 'BrandNew123!' });
    expect(editRes.status).toBe(302);

    // Old password no longer works; new one does.
    const oldLogin = await formPost(getAgent(), '/login', { email: u.email, password: 'Password123!' });
    expect(oldLogin.status).toBe(200);
    const newLogin = await formPost(getAgent(), '/login', { email: u.email, password: 'BrandNew123!' });
    expect(newLogin.status).toBe(302);
  });

  it('re-renders the form with an error on an invalid display name', async () => {
    const u = await getSeed().user({ email: 'invalid@example.com', password: 'Password123!' });
    const agent = getAgent();
    await loginAs(agent, u.email, u.password);
    // DisplayName.create rejects an empty/whitespace name.
    const res = await formPost(agent, '/profile/edit', { displayName: '   ' });
    expect(res.status).toBe(200); // profile-edit.hbs already renders errors.form
  });
});
