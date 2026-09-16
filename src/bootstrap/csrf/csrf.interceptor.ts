import { Injectable, ForbiddenException, type NestInterceptor, type ExecutionContext, type CallHandler } from '@nestjs/common';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type Req = {
  method: string;
  body?: { _csrf?: unknown };
  session?: { csrfToken?: string };
};

/**
 * Validates the CSRF token for multipart requests, where the body (and thus `_csrf`) is
 * parsed by the route's `FileInterceptor` (multer). The global `CsrfMiddleware` defers
 * multipart requests to this interceptor, so it MUST be applied AFTER `FileInterceptor`
 * on the route's `@UseInterceptors(...)` list — multer populates `req.body._csrf`, then
 * this interceptor validates it before the handler (and the ValidationPipe) run. Mirrors
 * the middleware's check for non-multipart bodies; `_csrf` is stripped after validation
 * so the `forbidNonWhitelisted` ValidationPipe doesn't reject it as an unknown DTO field.
 */
@Injectable()
export class CsrfInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Req>();
    if (STATE_CHANGING.has(req.method)) {
      const presented = req.body?._csrf;
      const expected = req.session?.csrfToken;
      if (typeof presented !== 'string' || presented !== expected) {
        throw new ForbiddenException('CSRF token mismatch');
      }
      if (req.body) delete req.body._csrf;
    }
    return next.handle();
  }
}
