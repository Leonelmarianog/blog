import { type ExecutionContext } from '@nestjs/common';
import { SessionGuard } from '@contexts/iam/presentation/http/guards/session.guard';
import { InMemorySession } from './in-memory-session';

type Res = { redirect: (url: string) => void; status: () => unknown };
type Req = { session: InMemorySession; headers: Record<string, unknown> };

function ctx(userId?: string) {
  const session = new InMemorySession();
  if (userId) session.userId = userId;
  const redirected = { url: '' as string };
  const res = { redirect: jest.fn((url: string) => { redirected.url = url; }), status: jest.fn().mockReturnThis() } as unknown as Res;
  const req = { session, headers: {} } as unknown as Req;
  const host = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as unknown as ExecutionContext;
  return { guard: new SessionGuard(), req, res, redirected, host };
}

describe('SessionGuard', () => {
  it('allows when req.session.userId is set', async () => {
    const { guard, host } = ctx('u1');
    expect(await guard.canActivate(host)).toBe(true);
  });

  it('redirects to /login and denies when no userId', async () => {
    const { guard, host, redirected } = ctx();
    expect(await guard.canActivate(host)).toBe(false);
    expect(redirected.url).toBe('/login');
  });
});
