import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerRequest } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

/**
 * Global throttle guard. The base `ThrottlerGuard` iterates every named throttler and calls
 * `handleRequest` for each; we override `handleRequest` only to swap in a per-name tracker, then
 * delegate to `super.handleRequest` so the base key-generation / storage / throw logic is reused.
 *
 * - `login-email`: tracker = sha256(trim(email).toLowerCase()) — hashed so raw emails are never
 *   written to Redis (anti-enumeration). Falls back to `req.ip` when `req.body.email` is absent or
 *   not a string so a malformed body can never bypass the email throttle (and the `login-ip`
 *   throttle still applies independently).
 * - All other throttlers (`login-ip`, `default`, `register`, `resend-*`, `reset-*`): IP tracker,
 *   preferring `req.ips[0]` (X-Forwarded-For, when `trust proxy` is on) over `req.ip`.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, throttler } = requestProps;
    const req = context.switchToHttp().getRequest();
    const tracker = await this.trackerFor(req, throttler.name ?? 'default');
    return super.handleRequest({ ...requestProps, getTracker: async () => tracker });
  }

  /** Tracker picker, exposed for unit testing via a probe subclass. */
  protected trackerFor(req: Record<string, unknown>, throttlerName: string): Promise<string> {
    if (throttlerName === 'login-email') {
      const email = (req as { body?: { email?: unknown } }).body?.email;
      if (typeof email === 'string' && email.trim().length > 0) {
        return Promise.resolve(hashEmail(email));
      }
    }
    const ip = ipOf(req);
    return Promise.resolve(ip);
  }
}

function ipOf(req: Record<string, unknown>): string {
  const ips = (req as { ips?: string[] }).ips;
  if (Array.isArray(ips) && ips.length > 0) return ips[0];
  return (req as { ip: string }).ip;
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}
