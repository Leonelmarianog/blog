import { AuthContextMiddleware } from '../../../src/bootstrap/auth-context/auth-context.middleware';

type Session = { userId?: string; role?: string };
type Req = { session: Session };
type Res = { locals: Record<string, unknown> };

function mk(session: Session) {
  const locals: Record<string, unknown> = {};
  const req: Req = { session };
  const res: Res = { locals };
  return { req, res, locals };
}

describe('AuthContextMiddleware', () => {
  it('sets anonymous locals when the session has no userId', () => {
    const { req, res, locals } = mk({});
    let next = false;
    new AuthContextMiddleware().use(req, res, () => { next = true; });
    expect(locals.isAuthenticated).toBe(false);
    expect(locals.isAdmin).toBe(false);
    expect(next).toBe(true);
  });

  it('sets isAuthenticated true and isAdmin false for a non-admin role', () => {
    const { req, res, locals } = mk({ userId: 'u1', role: 'READER' });
    new AuthContextMiddleware().use(req, res, () => {});
    expect(locals.isAuthenticated).toBe(true);
    expect(locals.isAdmin).toBe(false);
  });

  it('sets isAdmin true for the ADMIN role', () => {
    const { req, res, locals } = mk({ userId: 'u1', role: 'ADMIN' });
    new AuthContextMiddleware().use(req, res, () => {});
    expect(locals.isAuthenticated).toBe(true);
    expect(locals.isAdmin).toBe(true);
  });

  it('treats a missing role as authenticated non-admin (defensive)', () => {
    const { req, res, locals } = mk({ userId: 'u1' });
    new AuthContextMiddleware().use(req, res, () => {});
    expect(locals.isAuthenticated).toBe(true);
    expect(locals.isAdmin).toBe(false);
  });
});
