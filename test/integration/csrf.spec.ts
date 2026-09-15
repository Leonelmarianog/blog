import { useHarness } from './helpers/harness';
import { formPost } from './helpers/csrf';

const { getAgent } = useHarness();

describe('CSRF protection', () => {
  it('accepts a state-changing POST with a valid _csrf token (and strips it)', async () => {
    // Register is a @FormView POST; a valid _csrf means no CSRF error and no _csrf field error.
    // The 302 success redirect (not a 400/200 re-render) confirms CsrfMiddleware stripped _csrf
    // before ValidationPipe (forbidNonWhitelisted) saw it — the PR #6 strip regression guard.
    const res = await formPost(getAgent(), '/register', { email: 'csrf-ok@example.com', password: 'Password123!' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/login');
  });

  it('rejects a POST with a wrong _csrf token (403)', async () => {
    const agent = getAgent();
    const res = await agent.post('/register').type('form').send({
      email: 'csrf-bad@example.com',
      password: 'Password123!',
      _csrf: 'not-the-real-token',
    });
    expect(res.status).toBe(403);
    expect(res.text).toContain('CSRF token mismatch');
  });

  it('rejects a POST with no _csrf token (403)', async () => {
    const res = await getAgent().post('/register').type('form').send({
      email: 'csrf-none@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(403);
  });
});
