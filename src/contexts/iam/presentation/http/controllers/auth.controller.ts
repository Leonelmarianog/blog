import { Controller, Get, Post, Query, Body, Req, Res, UseGuards } from '@nestjs/common';
import { RegisterUseCase } from '@contexts/iam/application/commands/register.use-case';
import { VerifyEmailUseCase } from '@contexts/iam/application/commands/verify-email.use-case';
import { ResendVerificationUseCase } from '@contexts/iam/application/commands/resend-verification.use-case';
import { LoginUseCase } from '@contexts/iam/application/commands/login.use-case';
import { LogoutUseCase } from '@contexts/iam/application/commands/logout.use-case';
import { ForgotPasswordUseCase } from '@contexts/iam/application/commands/forgot-password.use-case';
import { ResetPasswordUseCase } from '@contexts/iam/application/commands/reset-password.use-case';
import { GetCurrentUserUseCase, type GetCurrentUserInput } from '@contexts/iam/application/queries/get-current-user.use-case';
import { RememberMeTokenService } from '@contexts/iam/application/services/remember-me-token.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { SessionGuard } from '../guards/session.guard';
import { FormView } from '@bootstrap/exceptions/form-view.decorator';

/**
 * Minimal request shape the AuthController reads from. Kept framework-agnostic
 * (no express import) so the unit test can pass a plain mock; NestJS injects the
 * real express request at runtime, which satisfies this structural contract.
 */
export interface AuthRequest {
  body: Record<string, unknown>;
  query: Record<string, string>;
  cookies: Record<string, string | undefined>;
  flash: (type: string, msg: string) => void;
  session: {
    userId?: string;
    flash?: unknown[];
    regenerate: (cb: () => void) => void;
    destroy: (cb: () => void) => void;
  };
}

/**
 * Minimal response shape the AuthController writes to. `locals.csrfToken` /
 * `locals.flash` are populated by upstream middleware (CSRF, FlashMiddleware).
 */
export interface AuthResponse {
  locals: { csrfToken: string; flash: unknown[] };
  redirect: (code: number, url: string) => void;
  render: (view: string, locals: Record<string, unknown>) => void;
  cookie: (name: string, value: string, opts: Record<string, unknown>) => void;
  clearCookie: (name: string, opts: Record<string, unknown>) => void;
}

const RM_COOKIE = 'rm';
const RM_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

@Controller()
export class AuthController {
  constructor(
    private readonly register: RegisterUseCase,
    private readonly verifyEmail: VerifyEmailUseCase,
    private readonly resendVerification: ResendVerificationUseCase,
    private readonly login: LoginUseCase,
    private readonly logout: LogoutUseCase,
    private readonly forgotPassword: ForgotPasswordUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Get('register')
  showRegister(@Res() res: AuthResponse): void {
    res.render('iam/register', {
      title: 'Register',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      errors: {},
      currentNav: 'register',
    });
  }

  @Post('register')
  @FormView('iam/register')
  async doRegister(@Body() dto: RegisterDto, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const result = await this.register.execute({ email: dto.email, password: dto.password, now: new Date() });
    if (result.ok) {
      req.flash('success', 'Check your email to verify your account.');
      res.redirect(302, '/login');
    } else {
      res.render('iam/register', {
        title: 'Register',
        csrfToken: res.locals.csrfToken,
        flash: res.locals.flash,
        email: dto.email,
        errors: { form: result.error.message },
        currentNav: 'register',
      });
    }
  }

  @Get('login')
  showLogin(@Res() res: AuthResponse): void {
    res.render('iam/login', {
      title: 'Login',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      errors: {},
      currentNav: 'login',
    });
  }

  @Post('login')
  @FormView('iam/login')
  async doLogin(@Body() dto: LoginDto, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const result = await this.login.execute({
      email: dto.email,
      password: dto.password,
      rememberMe: !!dto.rememberMe,
      now: new Date(),
    });
    if (!result.ok) {
      res.render('iam/login', {
        title: 'Login',
        csrfToken: res.locals.csrfToken,
        flash: res.locals.flash,
        email: dto.email,
        errors: { form: result.error.message },
        currentNav: 'login',
      });
      return;
    }
    this.establishSession(req, res, result.value.userId, result.value.rememberMeCookie);
    req.flash('success', 'Welcome back.');
    res.redirect(302, '/profile');
  }

  @Post('logout')
  async doLogout(@Body() _body: unknown, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const cookie = req.cookies?.[RM_COOKIE];
    if (cookie) {
      const parsed = RememberMeTokenService.parseCookie(cookie);
      if (parsed) await this.logout.execute({ series: parsed.series });
    }
    req.session.destroy(() => {
      res.clearCookie(RM_COOKIE, { path: '/' });
      res.redirect(302, '/');
    });
  }

  @Get('verify-email')
  async doVerifyEmail(@Query() q: VerifyEmailDto, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const result = await this.verifyEmail.execute({ selector: q.selector, verifier: q.verifier, now: new Date() });
    if (result.ok) req.flash('success', 'Your email has been verified.');
    else req.flash('error', result.error.message);
    res.redirect(302, '/login');
  }

  @Get('resend-verification')
  showResend(@Res() res: AuthResponse): void {
    res.render('iam/verify-email', {
      title: 'Resend verification',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      currentNav: '',
    });
  }

  @Post('resend-verification')
  @FormView('iam/verify-email')
  async doResend(@Body() dto: ResendVerificationDto, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    await this.resendVerification.execute({ email: dto.email, now: new Date() });
    req.flash('success', 'If the email is registered and unverified, a new link has been sent.');
    res.redirect(302, '/login');
  }

  @Get('forgot-password')
  showForgot(@Res() res: AuthResponse): void {
    res.render('iam/forgot-password', {
      title: 'Forgot password',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      errors: {},
      currentNav: '',
    });
  }

  @Post('forgot-password')
  @FormView('iam/forgot-password')
  async doForgot(@Body() dto: ForgotPasswordDto, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    await this.forgotPassword.execute({ email: dto.email, now: new Date() });
    req.flash('success', 'If the email is registered, a reset link has been sent.');
    res.redirect(302, '/login');
  }

  @Get('reset-password')
  showReset(@Query() q: { selector: string; verifier: string }, @Res() res: AuthResponse): void {
    res.render('iam/reset-password', {
      title: 'Reset password',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      selector: q.selector,
      verifier: q.verifier,
      errors: {},
      currentNav: '',
    });
  }

  @Post('reset-password')
  @FormView('iam/reset-password')
  async doReset(@Body() dto: ResetPasswordDto, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const result = await this.resetPassword.execute({
      selector: dto.selector,
      verifier: dto.verifier,
      newPassword: dto.newPassword,
      now: new Date(),
    });
    if (result.ok) {
      req.flash('success', 'Your password has been reset.');
      res.redirect(302, '/login');
    } else {
      res.render('iam/reset-password', {
        title: 'Reset password',
        csrfToken: res.locals.csrfToken,
        flash: res.locals.flash,
        selector: dto.selector,
        verifier: dto.verifier,
        errors: { form: result.error.message },
        currentNav: '',
      });
    }
  }

  @Get('profile')
  @UseGuards(SessionGuard)
  async showProfile(@Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    // SessionGuard (above) admits only requests with a userId; the cast bridges
    // the session's `string` to the use-case's branded `UserId` without importing
    // the domain layer (a context-presentation -> context-domain boundary leak).
    const result = await this.getCurrentUser.execute({
      userId: req.session.userId as GetCurrentUserInput['userId'],
    });
    if (!result.ok) {
      res.redirect(302, '/login');
      return;
    }
    res.render('iam/profile', {
      title: 'Profile',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      user: result.value,
      currentNav: '',
    });
  }

  /** Shared post-login session establishment — also the OAuth forward-compat seam (spec §1.4). */
  private establishSession(req: AuthRequest, res: AuthResponse, userId: string, rememberMeCookie: string | null): void {
    req.session.regenerate(() => {
      req.session.userId = userId;
      if (rememberMeCookie) res.cookie(RM_COOKIE, rememberMeCookie, RM_OPTS);
    });
  }
}