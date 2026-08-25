import { ForbiddenException } from '@nestjs/common';
import { CsrfMiddleware } from '../../../src/bootstrap/csrf/csrf.middleware';
import { InMemorySession } from '../iam/in-memory-session';

type Body = { _csrf?: unknown };
type Locals = { csrfToken?: string };
type Req = { method: string; body: Body; session: InMemorySession; headers: Record<string, unknown> };
type Res = { locals: Locals };

function mk(method = 'GET', body: Body = {}) {
  const session = new InMemorySession();
  const locals: Locals = {};
  const req: Req = { method, body, session, headers: {} };
  const res: Res = { locals };
  return { req, res, locals, session };
}

describe('CsrfMiddleware', () => {
  it('creates a csrf token lazily and exposes it via res.locals on GET', async () => {
    const { req, res, locals } = mk('GET');
    let next = false;
    await new CsrfMiddleware().use(req, res, () => { next = true; });
    expect(typeof locals.csrfToken).toBe('string');
    expect(locals.csrfToken!.length).toBeGreaterThan(20);
    expect(next).toBe(true);
  });

  it('reuses the existing session token', async () => {
    const { req, res, locals, session } = mk('GET');
    session.csrfToken = 'existing-token';
    await new CsrfMiddleware().use(req, res, () => {});
    expect(locals.csrfToken).toBe('existing-token');
  });

  it('allows a POST when _csrf matches the session token', async () => {
    const { req, res, session } = mk('POST', { _csrf: 'tok' });
    session.csrfToken = 'tok';
    let next = false;
    await new CsrfMiddleware().use(req, res, () => { next = true; });
    expect(next).toBe(true);
  });

  it('throws ForbiddenException on a POST with a mismatched _csrf', async () => {
    const { req, res, session } = mk('POST', { _csrf: 'wrong' });
    session.csrfToken = 'tok';
    await expect(new CsrfMiddleware().use(req, res, () => {})).rejects.toBeInstanceOf(ForbiddenException);
  });
});
