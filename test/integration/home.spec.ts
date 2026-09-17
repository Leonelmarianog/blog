import { useHarness } from './helpers/harness';
import { formPost, formPostUrls } from './helpers/csrf';

const { getAgent, getSeed } = useHarness();

async function loginAs(agent: ReturnType<typeof getAgent>, email: string, password: string): Promise<void> {
  const res = await formPost(agent, '/login', { email, password });
  expect(res.status).toBe(302);
}

describe('GET / (landing + auth-aware nav)', () => {
  it('renders the home page with anonymous nav (Login/Register, no Profile/Logout)', async () => {
    const res = await getAgent().get('/').set('Accept', 'text/html').expect(200);
    expect(res.text).toContain('<h2>Home</h2>');
    expect(res.text).toContain('/login');
    expect(res.text).toContain('/register');
    expect(res.text).not.toContain('/profile');
    expect(res.text).not.toContain('/logout');
    expect(res.text).not.toContain('/admin/users');
  });

  it('renders auth-aware nav after login (Profile + Logout, no Login/Register)', async () => {
    const u = await getSeed().user({ email: 'reader@example.com', password: 'Password123!' });
    const agent = getAgent();
    await loginAs(agent, u.email, u.password);
    const res = await agent.get('/').set('Accept', 'text/html').expect(200);
    expect(res.text).toContain('/profile');
    expect(res.text).toContain('/logout');
    expect(res.text).toContain('Log out');
    expect(res.text).not.toContain('/login');
    expect(res.text).not.toContain('/register');
    expect(res.text).not.toContain('/admin/users');
  });

  it('shows the Users admin link for an admin', async () => {
    const u = await getSeed().user({ email: 'admin@example.com', password: 'Password123!', role: 'ADMIN' });
    const agent = getAgent();
    await loginAs(agent, u.email, u.password);
    const res = await agent.get('/').set('Accept', 'text/html').expect(200);
    expect(res.text).toContain('/admin/users');
  });

  it('logs out via the nav form and returns to an anonymous home page', async () => {
    const u = await getSeed().user({ email: 'out@example.com', password: 'Password123!' });
    const agent = getAgent();
    await loginAs(agent, u.email, u.password);
    // Mint the CSRF token from the nav form on GET /, then POST /logout.
    const res = await formPostUrls(agent, '/', '/logout', {});
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    // After logout, a fresh GET / shows the anonymous nav again.
    const home = await agent.get('/').set('Accept', 'text/html').expect(200);
    expect(home.text).toContain('/login');
    expect(home.text).not.toContain('/profile');
  });
});
