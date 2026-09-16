import { useHarness } from './helpers/harness';

const { getAgent } = useHarness();

describe('Helmet headers', () => {
  it('sets CSP with img-src self and nosniff on every response', async () => {
    const res = await getAgent().get('/login').expect(200);
    const csp = res.headers['content-security-policy'] as string | undefined;
    expect(csp).toBeDefined();
    expect(csp).toContain("img-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
