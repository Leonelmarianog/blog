import { Catch, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

const STATIC_RETRY_AFTER = 15;

/** Minimal slice of the Express response the filter reads/writes. */
interface RateLimitResponse {
  status(code: number): this;
  render(view: string, opts?: Record<string, unknown>): void;
  redirect(code: number, url: string): void;
  set(name: string, value: string | number): this;
  json(body: unknown): void;
  getHeader(name: string): string | string[] | undefined;
  getHeaders(): Record<string, string | string[] | undefined>;
}

/** Minimal slice of the Express request the filter inspects. */
interface RateLimitRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  flash?(type: string, message: string): void;
}

/**
 * Content-negotiated 429. The base `ThrottlerGuard` sets a `Retry-After-<name>` response header
 * (value = the throttler's TTL) before throwing, so we forward the max retry-after header present;
 * if none, fall back to a static estimate.
 *
 * - HTML GET  → render `errors/429` with 429 + `Retry-After`.
 * - Form POST (HTML, not XHR) → 303 redirect to the referer (or `/`) with a flash error.
 * - XHR / JSON → `{ statusCode, message, retryAfter }` + `Retry-After` header.
 */
@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RateLimitRequest>();
    const res = ctx.getResponse<RateLimitResponse>();

    const retryAfter = this.readRetryAfter(res);
    res.set('Retry-After', retryAfter);

    const accept = String(req.headers?.accept ?? '');
    const isXhr = req.headers?.['x-requested-with'] === 'XMLHttpRequest';
    const wantsHtml = accept.includes('text/html');

    if (isXhr || accept.includes('application/json')) {
      res.status(429).json({ statusCode: 429, message: 'Too Many Requests', retryAfter });
      return;
    }

    if (wantsHtml && req.method === 'GET') {
      res.status(429).render('errors/429', { title: 'Too Many Requests' });
      return;
    }

    if (wantsHtml) {
      const referer = req.headers?.referer;
      req.flash?.('error', `Too many attempts — please try again in ${retryAfter} seconds.`);
      res.redirect(303, typeof referer === 'string' ? referer : '/');
      return;
    }

    // Fallback (any other content negotiation) — JSON.
    res.status(429).json({ statusCode: 429, message: 'Too Many Requests', retryAfter });
  }

  private readRetryAfter(res: RateLimitResponse): number {
    const headers = res.getHeaders() ?? {};
    let max = 0;
    for (const name of Object.keys(headers)) {
      if (!/^retry-after/i.test(name)) continue;
      const v = Number(headers[name]);
      if (!Number.isNaN(v) && v > max) max = v;
    }
    return max > 0 ? max : STATIC_RETRY_AFTER;
  }
}
