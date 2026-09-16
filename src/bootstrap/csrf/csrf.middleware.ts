import { Injectable, ForbiddenException, type NestMiddleware } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type Req = {
  method: string;
  body?: { _csrf?: unknown };
  session: { csrfToken?: string };
  headers?: Record<string, string | string[] | undefined>;
};

type Res = {
  locals: { csrfToken?: string };
};

/**
 * Multipart bodies are parsed by the route's `FileInterceptor` (multer), which runs as a
 * Nest interceptor — AFTER this Express middleware. So `req.body._csrf` is not yet
 * populated here for multipart POSTs. The route's `CsrfInterceptor` (applied after
 * `FileInterceptor`) validates the token once multer has parsed the body; this middleware
 * only mints/exposes the token for multipart and defers the check there.
 */
function isMultipart(req: Req): boolean {
  const ct = req.headers?.['content-type'];
  const value = Array.isArray(ct) ? ct[0] : ct;
  return typeof value === 'string' && value.startsWith('multipart/');
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  async use(req: Req, res: Res, next: () => void): Promise<void> {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString('base64url');
    }
    res.locals.csrfToken = req.session.csrfToken;

    if (STATE_CHANGING.has(req.method)) {
      // Multipart: defer the body check to the route's CsrfInterceptor (runs after
      // multer). Minting + res.locals above still happen so the form GET renders a token.
      if (isMultipart(req)) {
        next();
        return;
      }
      const presented = req.body?._csrf;
      if (typeof presented !== 'string' || presented !== req.session.csrfToken) {
        throw new ForbiddenException('CSRF token mismatch');
      }
      // Strip the CSRF field so downstream ValidationPipe (forbidNonWhitelisted)
      // doesn't reject it as an unexpected DTO property — _csrf is infrastructure,
      // not a form payload field.
      if (req.body) delete req.body._csrf;
    }
    next();
  }
}
