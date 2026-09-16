import { useHarness } from './helpers/harness';

const { getAgent } = useHarness();

describe('GET /health', () => {
  it('returns 200 ok for liveness without checking deps', async () => {
    const res = await getAgent().get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.info.uptime).toBe('number');
  });

  it('returns 200 with all deps up for readiness', async () => {
    const res = await getAgent().get('/health/ready').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info.database.status).toBe('up');
    expect(res.body.info.redis.status).toBe('up');
    expect(res.body.info.storage.status).toBe('up');
  });

  it('carries the CSP header on /health', async () => {
    const res = await getAgent().get('/health');
    const csp = res.headers['content-security-policy'] as string | undefined;
    expect(csp).toBeDefined();
    expect(csp).toContain("img-src 'self'");
  });
});
