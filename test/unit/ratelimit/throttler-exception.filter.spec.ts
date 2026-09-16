import { ThrottlerException } from '@nestjs/throttler';
import { ThrottlerExceptionFilter } from '@infra/ratelimit/throttler-exception.filter';

function fakeHost(opts: {
  method: string;
  accept?: string;
  xhr?: boolean;
  referer?: string;
  retryAfterHeader?: string;
}) {
  const headers: Record<string, string | string[]> = {};
  // The base guard sets `Retry-After[-<name>]` to the throttler TTL (seconds) before throwing.
  if (opts.retryAfterHeader) headers[opts.retryAfterHeader.toLowerCase()] = String(30);
  const req = {
    method: opts.method,
    headers: {
      accept: opts.accept ?? 'text/html',
      ...(opts.xhr ? { 'x-requested-with': 'XMLHttpRequest' } : {}),
      ...(opts.referer ? { referer: opts.referer } : {}),
    },
    flash: jest.fn(),
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    render: jest.fn(),
    redirect: jest.fn(),
    set: jest.fn().mockReturnThis(),
    json: jest.fn(),
    getHeader: (name: string) => headers[name.toLowerCase()],
    getHeaders: () => headers,
  };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  };
  return { req, res, host };
}

describe('ThrottlerExceptionFilter', () => {
  it('renders errors/429 with status 429 for an HTML GET', () => {
    const { res, host } = fakeHost({ method: 'GET', accept: 'text/html', retryAfterHeader: 'Retry-After' });
    new ThrottlerExceptionFilter().catch(new ThrottlerException(), host as never);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.render).toHaveBeenCalledWith('errors/429', expect.objectContaining({ title: 'Too Many Requests' }));
    expect(res.set).toHaveBeenCalledWith('Retry-After', 30);
  });

  it('redirects (303) with a flash error for a form POST', () => {
    const { req, res, host } = fakeHost({ method: 'POST', accept: 'text/html', referer: '/login', retryAfterHeader: 'Retry-After-login-ip' });
    new ThrottlerExceptionFilter().catch(new ThrottlerException(), host as never);
    expect(req.flash).toHaveBeenCalledWith('error', expect.stringContaining('Too many attempts'));
    expect(res.redirect).toHaveBeenCalledWith(303, '/login');
  });

  it('returns JSON for an XHR request', () => {
    const { res, host } = fakeHost({ method: 'POST', xhr: true, retryAfterHeader: 'Retry-After-login-email' });
    new ThrottlerExceptionFilter().catch(new ThrottlerException(), host as never);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.set).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 429, message: 'Too Many Requests' }));
  });

  it('falls back to a static Retry-After when no retry-after header was set', () => {
    const { res, host } = fakeHost({ method: 'GET', accept: 'text/html' });
    new ThrottlerExceptionFilter().catch(new ThrottlerException(), host as never);
    expect(res.set).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });
});
