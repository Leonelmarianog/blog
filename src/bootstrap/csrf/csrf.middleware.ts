import { Injectable, ForbiddenException, type NestMiddleware } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type Req = {
  method: string;
  body?: { _csrf?: unknown };
  session: { csrfToken?: string };
};

type Res = {
  locals: { csrfToken?: string };
};

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  async use(req: Req, res: Res, next: () => void): Promise<void> {
    if (!req.session.csrfToken) {
      req.session.csrfToken = randomBytes(32).toString('base64url');
    }
    res.locals.csrfToken = req.session.csrfToken;

    if (STATE_CHANGING.has(req.method)) {
      const presented = req.body?._csrf;
      if (typeof presented !== 'string' || presented !== req.session.csrfToken) {
        throw new ForbiddenException('CSRF token mismatch');
      }
    }
    next();
  }
}
