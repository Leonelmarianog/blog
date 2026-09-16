import helmet from 'helmet';
import type { RequestHandler } from 'express';
import type { ConfigService } from '../../config/config.service';
import { buildCspDirectives } from './csp.factory';

/**
 * Helmet with a baseline CSP. All other helmet defaults (HSTS, frameguard, noSniff, …) stay on.
 * CSP is computed once at boot from config (not per-request). If helmet's types reject the plain
 * directives record, cast to its `ContentSecurityPolicyDirectiveOptions` type.
 */
export function createHelmet(config: ConfigService): RequestHandler {
  return helmet({ contentSecurityPolicy: { directives: buildCspDirectives(config) } });
}
