import { Reflector } from '@nestjs/core';
import { AppThrottlerGuard } from '@infra/ratelimit/app-throttler.guard';

/**
 * Subclass that exposes the protected tracker-picker so the unit test can assert per-name
 * selection without standing up the full ThrottlerGuard canActivate loop.
 */
class ProbeGuard extends AppThrottlerGuard {
  exposeTracker(req: Record<string, unknown>, throttlerName: string): Promise<string> {
    return this.trackerFor(req, throttlerName);
  }
}

function makeGuard(): ProbeGuard {
  return new ProbeGuard([], { increment: async () => ({ totalHits: 1, timeToExpire: 1, isBlocked: false, timeToBlockExpire: 1 }) }, new Reflector());
}

describe('AppThrottlerGuard tracker selection', () => {
  it('uses req.ips[0] (then req.ip) for IP throttlers', async () => {
    const guard = makeGuard();
    expect(await guard.exposeTracker({ ip: '1.2.3.4', ips: [] }, 'login-ip')).toBe('1.2.3.4');
    expect(await guard.exposeTracker({ ip: '9.9.9.9', ips: ['5.5.5.5'] }, 'default')).toBe('5.5.5.5');
    expect(await guard.exposeTracker({ ip: '1.2.3.4', ips: [] }, 'register')).toBe('1.2.3.4');
  });

  it('uses a sha256 hash of the trimmed/lowercased email for login-email', async () => {
    const guard = makeGuard();
    const t = await guard.exposeTracker({ ip: '1.2.3.4', body: { email: '  Ada@Example.COM ' } }, 'login-email');
    // sha256('ada@example.com') hex
    expect(t).toBe('b5fc85e55755f9e0d030a10ab4429b6b2944855f9a0d60077fe832becbc41d72');
  });

  it('falls back to IP when email is absent for login-email', async () => {
    const guard = makeGuard();
    expect(await guard.exposeTracker({ ip: '1.2.3.4', body: {} }, 'login-email')).toBe('1.2.3.4');
  });

  it('falls back to IP when email is not a string for login-email', async () => {
    const guard = makeGuard();
    expect(await guard.exposeTracker({ ip: '1.2.3.4', body: { email: 42 } }, 'login-email')).toBe('1.2.3.4');
  });
});
