import { AuthController, type AuthRequest, type AuthResponse } from '@contexts/iam/presentation/http/controllers/auth.controller';
import type { RegisterUseCase } from '@contexts/iam/application/commands/register.use-case';
import type { VerifyEmailUseCase } from '@contexts/iam/application/commands/verify-email.use-case';
import type { ResendVerificationUseCase } from '@contexts/iam/application/commands/resend-verification.use-case';
import type { LoginUseCase } from '@contexts/iam/application/commands/login.use-case';
import type { LogoutUseCase } from '@contexts/iam/application/commands/logout.use-case';
import type { ForgotPasswordUseCase } from '@contexts/iam/application/commands/forgot-password.use-case';
import type { ResetPasswordUseCase } from '@contexts/iam/application/commands/reset-password.use-case';
import type { GetCurrentUserUseCase } from '@contexts/iam/application/queries/get-current-user.use-case';
import { ok, fail, type Result } from '@kernel/application';
import { DomainError } from '@kernel/domain';

interface MockSession {
  userId?: string;
  flash: unknown[];
  regenerate?: (cb: () => void) => void;
  destroy?: (cb: () => void) => void;
}

interface MockReq {
  body: Record<string, unknown>;
  query: Record<string, string>;
  cookies: Record<string, string | undefined>;
  flash: (type: string, msg: string) => void;
  session: MockSession;
}

interface Rendered {
  view: string;
  locals: Record<string, unknown>;
}

interface CookieSet {
  name: string;
  value: string;
  opts: Record<string, unknown>;
}

interface MockRes {
  locals: { csrfToken: string; flash: unknown[] };
  redirected: string;
  rendered: Rendered | null;
  cookieSet: CookieSet | null;
  redirect: jest.Mock;
  render: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
}

// A use-case mock is a { execute: jest.Mock } returning the given Result.
type UseCaseMock = { execute: jest.Mock };

function mockUseCase(result: Result<unknown, DomainError>): UseCaseMock {
  return { execute: jest.fn(async () => result) };
}

function mkRes(): MockRes {
  const res: MockRes = {
    locals: { csrfToken: 'csrf', flash: [] },
    redirected: '',
    rendered: null,
    cookieSet: null,
    redirect: jest.fn((code: number | string, url?: string) => {
      res.redirected = typeof code === 'string' ? code : (url ?? '');
    }),
    render: jest.fn((view: string, locals: Record<string, unknown>) => {
      res.rendered = { view, locals };
    }),
    cookie: jest.fn((name: string, value: string, opts: Record<string, unknown>) => {
      res.cookieSet = { name, value, opts };
    }),
    clearCookie: jest.fn(),
  };
  return res;
}

function mkReq(body: Record<string, unknown> = {}, opts: { userId?: string; cookie?: string } = {}): MockReq {
  const session: MockSession = { flash: [] };
  if (opts.userId) session.userId = opts.userId;
  return {
    body,
    session,
    cookies: opts.cookie ? { rm: opts.cookie } : {},
    query: {},
    flash: (type: string, msg: string): void => {
      session.flash.push({ type, msg });
    },
  };
}

describe('AuthController', () => {
  it('POST /register flashes success and redirects to /login', async () => {
    const register = mockUseCase(ok({ userId: 'u1' })) as unknown as RegisterUseCase;
    const c = new AuthController(
      register,
      {} as unknown as VerifyEmailUseCase,
      {} as unknown as ResendVerificationUseCase,
      {} as unknown as LoginUseCase,
      {} as unknown as LogoutUseCase,
      {} as unknown as ForgotPasswordUseCase,
      {} as unknown as ResetPasswordUseCase,
      {} as unknown as GetCurrentUserUseCase,
    );
    const req = mkReq({ email: 'a@b.com', password: 'pw' });
    const res = mkRes();
    await c.doRegister(
      { email: 'a@b.com', password: 'pw' },
      req as unknown as AuthRequest,
      res as unknown as AuthResponse,
    );
    expect(register.execute).toHaveBeenCalled();
    expect(req.session.flash).toContainEqual({ type: 'success', msg: expect.any(String) });
    expect(res.redirected).toBe('/login');
  });

  it('POST /register re-renders on a Result fail', async () => {
    const register = mockUseCase(fail(new DomainError('Email already registered'))) as unknown as RegisterUseCase;
    const c = new AuthController(
      register,
      {} as unknown as VerifyEmailUseCase,
      {} as unknown as ResendVerificationUseCase,
      {} as unknown as LoginUseCase,
      {} as unknown as LogoutUseCase,
      {} as unknown as ForgotPasswordUseCase,
      {} as unknown as ResetPasswordUseCase,
      {} as unknown as GetCurrentUserUseCase,
    );
    const req = mkReq({ email: 'a@b.com', password: 'pw' });
    const res = mkRes();
    await c.doRegister(
      { email: 'a@b.com', password: 'pw' },
      req as unknown as AuthRequest,
      res as unknown as AuthResponse,
    );
    expect(res.rendered?.view).toBe('iam/register');
    expect(res.rendered?.locals.errors).toBeDefined();
  });

  it('POST /login establishes session and redirects to /profile', async () => {
    const login = mockUseCase(ok({ userId: 'u1', rememberMeCookie: 's.t' })) as unknown as LoginUseCase;
    const c = new AuthController(
      {} as unknown as RegisterUseCase,
      {} as unknown as VerifyEmailUseCase,
      {} as unknown as ResendVerificationUseCase,
      login,
      {} as unknown as LogoutUseCase,
      {} as unknown as ForgotPasswordUseCase,
      {} as unknown as ResetPasswordUseCase,
      {} as unknown as GetCurrentUserUseCase,
    );
    const req = mkReq({ email: 'a@b.com', password: 'pw', rememberMe: true });
    // emulate regenerate: the controller's establishSession calls
    // req.session.regenerate(cb) where cb sets userId + optional cookie.
    req.session.regenerate = (cb: () => void): void => {
      req.session.userId = undefined;
      cb();
    };
    const res = mkRes();
    await c.doLogin(
      { email: 'a@b.com', password: 'pw', rememberMe: true },
      req as unknown as AuthRequest,
      res as unknown as AuthResponse,
    );
    expect(res.redirected).toBe('/profile');
    expect(res.cookieSet).not.toBeNull();
    expect(req.session.userId).toBe('u1');
  });

  it('POST /logout destroys session and clears cookies, redirects to /', async () => {
    const logout = mockUseCase(ok({})) as unknown as LogoutUseCase;
    const c = new AuthController(
      {} as unknown as RegisterUseCase,
      {} as unknown as VerifyEmailUseCase,
      {} as unknown as ResendVerificationUseCase,
      {} as unknown as LoginUseCase,
      logout,
      {} as unknown as ForgotPasswordUseCase,
      {} as unknown as ResetPasswordUseCase,
      {} as unknown as GetCurrentUserUseCase,
    );
    const req = mkReq({}, { userId: 'u1' });
    req.session.destroy = (cb: () => void): void => {
      req.session.userId = undefined;
      cb();
    };
    const res = mkRes();
    await c.doLogout({}, req as unknown as AuthRequest, res as unknown as AuthResponse);
    expect(res.redirected).toBe('/');
    expect(res.clearCookie).toHaveBeenCalled();
  });
});
