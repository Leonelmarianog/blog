import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { configureViewEngine } from './bootstrap/views/view-engine';
import { createSessionMiddleware } from './bootstrap/sessions/session-middleware';
import { FlashMiddleware } from './bootstrap/flash/flash.middleware';
import { CsrfMiddleware } from './bootstrap/csrf/csrf.middleware';
import { RememberMeMiddleware } from './bootstrap/remember-me/remember-me.middleware';
import { ValidationExceptionFilter } from './bootstrap/exceptions/validation-exception.filter';
import { GlobalExceptionFilter } from './bootstrap/exceptions/global-exception.filter';
import { FormViewInterceptor } from './bootstrap/exceptions/form-view.interceptor';
import { ThrottlerExceptionFilter } from './infrastructure/ratelimit/throttler-exception.filter';
import { RotateSessionUseCase } from '@contexts/iam/application/commands/rotate-session.use-case';
import pinoHttp from 'pino-http';
import type { DestinationStream } from 'pino';
import { Logger } from 'nestjs-pino';
import { buildPinoOptions } from './bootstrap/logging/pino.factory';
import { createCorrelationMiddleware } from './bootstrap/logging/correlation.middleware';
import { createHelmet } from './bootstrap/helmet/helmet.factory';

/**
 * Builds the fully-wired INestApplication — view engine, body parsers, the Express
 * middleware chain (cookie/session/remember-me/flash/csrf), the ValidationPipe, the
 * global filters (catch-all first so the specific ValidationExceptionFilter wins after
 * Nest's internal reverse), and the FormViewInterceptor — WITHOUT listening. Shared by
 * `src/main.ts` (production) and the integration tests so the boot path has one source
 * of truth.
 *
 * `app.init()` is awaited before returning: `NestFactory.create()` only scans modules and
 * instantiates dependencies — it does NOT call `NestApplication.init()`/`registerRouter()`,
 * so the Nest router (and thus every controller route) is not mounted on the Express
 * instance until `init()` (or `listen()`, which calls `init()`) runs. Production `main.ts`
 * calls `listen()`, which is why the omission was invisible there; tests drive the app
 * without listening, so `init()` must run here. `init()` is idempotent (guarded by
 * `isInitialized`), so the subsequent `listen()` in `main.ts` is a no-op for init.
 */
export interface AppOptions {
  pinoDestination?: DestinationStream;
}

export async function createApp(opts: AppOptions = {}): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  const config = app.get(ConfigService);

  // Helmet first so every response (including middleware-thrown errors) carries security
  // headers + the config-derived CSP. Mounted before pino/logger so headers land even when a
  // downstream middleware throws before logging.
  app.use(createHelmet(config));

  // Use pino as Nest's logger (flushes buffered bootstrap logs).
  app.useLogger(app.get(Logger));

  // View engine first so res.render works in filters/middleware. `configureViewEngine`
  // expects the Express instance, not the Nest app; the HttpAdapter wraps Express. The
  // same instance is reused below to set `trust proxy` (Express settings live on it).
  const expressInstance = app.getHttpAdapter().getInstance();
  configureViewEngine(expressInstance);

  // Trust X-Forwarded-For so per-IP rate limiting uses the real client IP behind a proxy.
  // 0 = off (req.ips stays empty; the IP tracker falls back to the socket address).
  expressInstance.set('trust proxy', config.get('TRUST_PROXY'));

  // Serve locally-stored media objects when the local-disk storage driver is active.
  // The LocalDiskStorageAdapter.publicUrl returns "/storage/<key>"; this mount makes
  // those URLs resolvable in dev/test. S3/Garage drivers serve objects from their own
  // origin, so the mount is skipped.
  if (config.get('STORAGE_DRIVER') === 'local') {
    app.use('/storage', express.static(config.get('STORAGE_LOCAL_DIR')));
  }

  // Body parsers must run before cookieParser/session/flash/csrf so req.body is
  // populated before csrf reads req.body._csrf.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging — every request (incl. csrf 403s and pre-router 404s, which mount below)
  // gets a correlation id and redacted secrets. MUST run after the body parsers: pino-http
  // serializes `req` once when it creates its child logger (here), so req.body is only present
  // for the `req.body.*` redact paths if the parsers have already populated it. Helmet (Task 4)
  // mounts above this; correlation (Task 3) mounts just below.
  app.use(pinoHttp(buildPinoOptions(config, opts.pinoDestination)));
  app.use(createCorrelationMiddleware());

  // Express middleware chain — order matters:
  //   bodyParsers -> cookieParser -> session -> remember-me -> flash -> csrf
  const rememberMe = new RememberMeMiddleware(app.get(RotateSessionUseCase));
  const flash = new FlashMiddleware();
  const csrf = new CsrfMiddleware();
  app.use(cookieParser());
  app.use(createSessionMiddleware(config));
  // `app.use` on INestApplication is typed `(...args: any[])`; wrap each middleware so
  // the call type-checks without an `any` token (`Parameters<typeof X.use>`).
  app.use((...a: Parameters<typeof rememberMe.use>) => rememberMe.use(...a));
  app.use((...a: Parameters<typeof flash.use>) => flash.use(...a));
  app.use((...a: Parameters<typeof csrf.use>) => csrf.use(...a));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: false }));
  // Nest reverses the global-filters array before selection and picks the first @Catch match.
  // Input order [GlobalExceptionFilter (catch-all), ThrottlerExceptionFilter (@Catch(ThrottlerException)),
  // ValidationExceptionFilter (@Catch(BadRequestException))] reverses to [Validation, Throttler, Global],
  // so both specific filters win over the catch-all. A ThrottlerException is handled here, not as a 500.
  app.useGlobalFilters(new GlobalExceptionFilter(), new ThrottlerExceptionFilter(), new ValidationExceptionFilter());
  app.useGlobalInterceptors(new FormViewInterceptor(app.get(Reflector)));

  // Mount the Nest router (controller routes, not-found handler, exception handler) on the
  // Express instance. Without this, every request falls through to Express's default
  // `Cannot GET /…` 404. See the doc comment above for why this is required for tests.
  await app.init();

  return app;
}
