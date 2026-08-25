import { RememberMeMiddleware } from '@bootstrap/remember-me/remember-me.middleware';
import { type RotateSessionUseCase } from '@contexts/iam/application/commands/rotate-session.use-case';
import { InMemorySession } from './in-memory-session';

type Rotate = { execute: jest.Mock };
type Req = { session: InMemorySession; cookies: Record<string, string> };
type Res = { cookie: jest.Mock; clearCookie: jest.Mock };
type CookieOpts = Record<string, unknown>;

function makeDeps() {
  const execute = jest.fn();
  const rotate = { execute } as unknown as Rotate;
  const cookieSet = { value: '' as string, opts: {} as unknown as CookieOpts };
  const res = {
    cookie: jest.fn((name: string, value: string, opts: CookieOpts) => { cookieSet.value = value; cookieSet.opts = opts; }),
    clearCookie: jest.fn(),
  } as unknown as Res;
  return { rotate, res, cookieSet };
}

function reqWith(cookie?: string) {
  const session = new InMemorySession();
  const req = { session, cookies: cookie ? { rm: cookie } : {} } as unknown as Req;
  return { req, session };
}

describe('RememberMeMiddleware', () => {
  it('does nothing when there is already a session userId', async () => {
    const { rotate, res } = makeDeps();
    const { req } = reqWith('series.token');
    req.session.userId = 'u1';
    let calledNext = false;
    await new RememberMeMiddleware(rotate as unknown as RotateSessionUseCase).use(req, res, () => { calledNext = true; });
    expect(rotate.execute).not.toHaveBeenCalled();
    expect(calledNext).toBe(true);
  });

  it('rotates and sets userId + refreshed cookie on a valid credential', async () => {
    const { rotate, res, cookieSet } = makeDeps();
    const { req, session } = reqWith('series.token');
    rotate.execute.mockResolvedValue({ ok: true, value: { userId: 'u1', rememberMeCookie: 'series.newtoken' } });
    let calledNext = false;
    await new RememberMeMiddleware(rotate as unknown as RotateSessionUseCase).use(req, res, () => { calledNext = true; });
    expect(session.userId).toBe('u1');
    expect(res.cookie).toHaveBeenCalled();
    expect(cookieSet.value).toBe('series.newtoken');
    expect(calledNext).toBe(true);
  });

  it('clears the cookie and falls through on a theft/mismatch failure', async () => {
    const { rotate, res } = makeDeps();
    const { req, session } = reqWith('series.token');
    rotate.execute.mockResolvedValue({ ok: false, error: new Error('mismatch') });
    let calledNext = false;
    await new RememberMeMiddleware(rotate as unknown as RotateSessionUseCase).use(req, res, () => { calledNext = true; });
    expect(session.userId).toBeUndefined();
    expect(res.clearCookie).toHaveBeenCalledWith('rm', expect.anything());
    expect(calledNext).toBe(true);
  });

  it('falls through when the cookie is unparseable', async () => {
    const { rotate, res } = makeDeps();
    const { req } = reqWith('garbage');
    let calledNext = false;
    await new RememberMeMiddleware(rotate as unknown as RotateSessionUseCase).use(req, res, () => { calledNext = true; });
    expect(rotate.execute).not.toHaveBeenCalled();
    expect(calledNext).toBe(true);
  });
});
