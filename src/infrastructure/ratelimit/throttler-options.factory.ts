import type { ThrottlerOptions } from '@nestjs/throttler';
import type { ConfigService } from '../../config/config.service';

/** Fixed 1h TTL for account-creation / email-resend / password-reset routes (not env). */
const ONE_HOUR_TTL = 3600;

/**
 * Builds the named-throttler array for `ThrottlerModule.forRootAsync`. TTL/limit come from
 * `RATE_LIMIT_*` env; the register/resend/reset TTLs are fixed code constants. The
 * `login-ip` and `login-email` throttlers share the same TTL/limit but key on different
 * trackers (see `AppThrottlerGuard`); both must pass for a login to proceed.
 */
export function buildThrottlerOptions(config: ConfigService): ThrottlerOptions[] {
  return [
    { name: 'default', ttl: config.get('RATE_LIMIT_GLOBAL_TTL'), limit: config.get('RATE_LIMIT_GLOBAL_LIMIT') },
    { name: 'login-ip', ttl: config.get('RATE_LIMIT_LOGIN_TTL'), limit: config.get('RATE_LIMIT_LOGIN_LIMIT') },
    { name: 'login-email', ttl: config.get('RATE_LIMIT_LOGIN_TTL'), limit: config.get('RATE_LIMIT_LOGIN_LIMIT') },
    { name: 'register', ttl: ONE_HOUR_TTL, limit: config.get('RATE_LIMIT_REGISTER_LIMIT') },
    { name: 'resend-verification', ttl: ONE_HOUR_TTL, limit: config.get('RATE_LIMIT_RESEND_LIMIT') },
    { name: 'resend-reset', ttl: ONE_HOUR_TTL, limit: config.get('RATE_LIMIT_RESEND_LIMIT') },
    { name: 'reset-submit', ttl: ONE_HOUR_TTL, limit: config.get('RATE_LIMIT_RESET_LIMIT') },
  ];
}
