import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';

const { getAgent, getSeed } = useHarness();

describe('error rendering', () => {
  it('renders the 404 page for an unknown route', async () => {
    const res = await getAgent().get('/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.text).toContain('404 — Not Found');
  });

  it('renders the 403 page (with message) on a policy failure', async () => {
    const author = await getSeed().user({ email: 'forbidden@example.com', password: 'Password123!', role: 'AUTHOR' });
    const agent = getAgent();
    const loginRes = await formPost(agent, '/login', { email: author.email, password: author.password });
    expect(loginRes.status).toBe(302);
    const res = await agent.get('/admin/users');
    expect(res.status).toBe(403);
    expect(res.text).toContain('Forbidden');
  });

  it('renders the 403 page on a CSRF failure', async () => {
    const res = await getAgent().post('/register').type('form').send({ email: 'x@x.com', password: 'Password123!', _csrf: 'bad' });
    expect(res.status).toBe(403);
    expect(res.text).toContain('Forbidden');
  });

  it('re-renders the form view (status 200, not the 400 page) on a validation failure — filter-order guard', async () => {
    const res = await formPost(getAgent(), '/register', { email: 'bad', password: 'short' });
    expect(res.status).toBe(200); // ValidationExceptionFilter re-renders @FormView, NOT GlobalExceptionFilter's 400 page
    expect(res.text).not.toContain('400 — Bad Request');
    expect(res.text).toContain('<form');
  });
});
