import { Injectable, type NestMiddleware } from '@nestjs/common';
import { RotateSessionUseCase } from '@contexts/iam/application/commands/rotate-session.use-case';
import { RememberMeTokenService } from '@contexts/iam/application/services/remember-me-token.service';

const COOKIE_NAME = 'rm';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

type Req = {
  session: { userId?: string };
  cookies?: Record<string, string>;
};

type Res = {
  cookie: (name: string, value: string, opts: unknown) => void;
  clearCookie: (name: string, opts: unknown) => void;
};

@Injectable()
export class RememberMeMiddleware implements NestMiddleware {
  constructor(private readonly rotateSession: RotateSessionUseCase) {}

  async use(req: Req, res: Res, next: () => void): Promise<void> {
    if (req.session?.userId) return next();
    const cookie: string | undefined = req.cookies?.[COOKIE_NAME];
    if (!cookie) return next();

    const parsed = RememberMeTokenService.parseCookie(cookie);
    if (!parsed) return next();

    const result = await this.rotateSession.execute({
      series: parsed.series,
      token: parsed.token,
      now: new Date(),
    });

    if (result.ok) {
      req.session.userId = result.value.userId;
      res.cookie(COOKIE_NAME, result.value.rememberMeCookie, COOKIE_OPTS);
    } else {
      res.clearCookie(COOKIE_NAME, { path: '/' });
    }
    next();
  }
}
