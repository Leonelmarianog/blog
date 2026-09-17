import { Injectable, type NestMiddleware } from '@nestjs/common';

type Req = {
  session: { userId?: string; role?: string };
};

type Res = {
  locals: Record<string, unknown>;
};

/**
 * Derives auth-aware view locals from the session so every rendered page (including
 * error pages, since Express middleware runs before Nest filters) can show a nav that
 * reflects the viewer's authentication state. MUST mount after session + remember-me so
 * userId/role are restored from the cookie first.
 */
@Injectable()
export class AuthContextMiddleware implements NestMiddleware {
  use(req: Req, res: Res, next: () => void): void {
    res.locals.isAuthenticated = !!req.session?.userId;
    res.locals.isAdmin = req.session?.role === 'ADMIN';
    next();
  }
}
