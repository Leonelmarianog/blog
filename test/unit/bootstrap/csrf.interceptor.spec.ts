import { ForbiddenException, type ExecutionContext, type CallHandler } from '@nestjs/common';
import { CsrfInterceptor } from '../../../src/bootstrap/csrf/csrf.interceptor';

type Req = { method: string; body: { _csrf?: unknown }; session: { csrfToken?: string } };

function ctx(method: string, body: Req['body'], session: Req['session']): ExecutionContext {
  const req: Req = { method, body, session };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

/** A CallHandler whose `handle()` is a jest mock returning a sentinel observable. */
function handler(): jest.Mocked<CallHandler> {
  return { handle: jest.fn(() => ({})) } as unknown as jest.Mocked<CallHandler>;
}

describe('CsrfInterceptor', () => {
  it('passes a POST whose _csrf matches the session token and strips _csrf from the body', () => {
    const body: Req['body'] = { _csrf: 'tok' };
    const h = handler();
    new CsrfInterceptor().intercept(ctx('POST', body, { csrfToken: 'tok' }), h);
    expect(h.handle).toHaveBeenCalled();
    expect(body._csrf).toBeUndefined();
  });

  it('throws ForbiddenException on a POST with a mismatched _csrf', () => {
    expect(() => new CsrfInterceptor().intercept(ctx('POST', { _csrf: 'wrong' }, { csrfToken: 'tok' }), handler()))
      .toThrow(ForbiddenException);
  });

  it('throws ForbiddenException on a POST with no _csrf (missing token)', () => {
    expect(() => new CsrfInterceptor().intercept(ctx('POST', {}, { csrfToken: 'tok' }), handler()))
      .toThrow(ForbiddenException);
  });

  it('is a no-op for GET (lets the request through without checking _csrf)', () => {
    const h = handler();
    new CsrfInterceptor().intercept(ctx('GET', {}, { csrfToken: 'tok' }), h);
    expect(h.handle).toHaveBeenCalled();
  });
});
