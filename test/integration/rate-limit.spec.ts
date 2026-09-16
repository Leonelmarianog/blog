import { useHarness } from './helpers/harness';
import { formPost, getCsrfToken } from './helpers/csrf';

const { getAgent, getSeed } = useHarness();

describe('rate limiting', () => {
  it('throttles login per IP after the limit (form POST → 303 + flash)', async () => {
    const u = await getSeed().user({ email: 'ip@example.com', password: 'Password123!', emailVerified: true });
    const agent = getAgent();

    // First RATE_LIMIT_LOGIN_LIMIT (10) attempts from the same IP pass (200 re-render or 302).
    for (let i = 0; i < 10; i++) {
      const res = await formPost(agent, '/login', { email: u.email, password: 'WrongPassword!' });
      expect([200, 302]).toContain(res.status);
    }

    // 11th from the same IP is blocked by the login-ip throttler → 303 redirect + flash.
    const blocked = await formPost(agent, '/login', { email: u.email, password: 'WrongPassword!' });
    expect(blocked.status).toBe(303);
  });

  it('throttles login per email from rotating IPs', async () => {
    const u = await getSeed().user({ email: 'email@example.com', password: 'Password123!', emailVerified: true });

    // 10 requests for the SAME email from distinct IPs (X-Forwarded-For) pass the email throttle.
    for (let i = 0; i < 10; i++) {
      const ip = `10.0.0.${i + 1}`;
      const agent = getAgent();
      const res = await agent.get('/login').set('X-Forwarded-For', ip).set('Accept', 'text/html').expect(200);
      const csrf = getCsrfToken(res.text);
      const post = await agent
        .post('/login')
        .type('form')
        .set('X-Forwarded-For', ip)
        .set('Accept', 'text/html')
        .send({ email: u.email, password: 'WrongPassword!', _csrf: csrf });
      expect([200, 302]).toContain(post.status);
    }

    // 11th distinct IP, same email → blocked by the login-email throttler.
    const ip = '10.0.0.11';
    const agent = getAgent();
    const res = await agent.get('/login').set('X-Forwarded-For', ip).set('Accept', 'text/html').expect(200);
    const csrf = getCsrfToken(res.text);
    const blocked = await agent
      .post('/login')
      .type('form')
      .set('X-Forwarded-For', ip)
      .set('Accept', 'text/html')
      .send({ email: u.email, password: 'WrongPassword!', _csrf: csrf });
    expect(blocked.status).toBe(303);
  });

  it('never throttles /health', async () => {
    const agent = getAgent();
    for (let i = 0; i < 20; i++) {
      await agent.get('/health').expect(200);
    }
  });

  it('returns JSON for an XHR 429', async () => {
    const u = await getSeed().user({ email: 'xhr@example.com', password: 'Password123!', emailVerified: true });
    const agent = getAgent();
    // Saturate the login-ip throttle with form posts first (same agent → same socket IP).
    for (let i = 0; i < 10; i++) {
      await formPost(agent, '/login', { email: u.email, password: 'WrongPassword!' });
    }
    // 11th as XHR (JSON). Mint a csrf token on a fresh GET, then POST as an XHR.
    const getRes = await agent.get('/login').expect(200);
    const csrf = getCsrfToken(getRes.text);
    const blocked = await agent
      .post('/login')
      .type('form')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Accept', 'application/json')
      .send({ email: u.email, password: 'WrongPassword!', _csrf: csrf });
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(JSON.parse(blocked.text).statusCode).toBe(429);
  });
});
