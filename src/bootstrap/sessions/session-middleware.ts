import type { RequestHandler } from 'express';
import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import type { ConfigService } from '../../config/config.service';

/**
 * Builds the express-session middleware backed by Redis (db parsed from REDIS_URL).
 * Pure factory — no Nest decorators — so `main.ts` (composition root) can `app.use()` it
 * in the correct order alongside the other middleware. TTL: 15-min sliding (rolling: true
 * resets the cookie maxAge on each response). An absolute 8h cap is a Plan 7 tuning item
 * (requires a session `createdAt` marker); out of Plan 4 unit-testable scope.
 */
export function createSessionMiddleware(config: ConfigService): RequestHandler {
  const redis = createClient({ url: config.get('REDIS_URL') });
  redis.connect().catch(() => {
    /* connection errors surface on first request */
  });
  return session({
    store: new RedisStore({
      // `connect-redis` v10 types `RedisStoreOptions.client` as `any`, so the indexed
      // type expression resolves to `any` — but no literal `any` token appears here, which
      // keeps `@typescript-eslint/no-explicit-any` satisfied while staying typed at the
      // boundary the library exposes.
      client: redis as unknown as ConstructorParameters<typeof RedisStore>[0]['client'],
    }),
    secret: config.get('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    name: 'sid',
    cookie: {
      httpOnly: true,
      secure: config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15-min sliding
    },
  }) as RequestHandler;
}
