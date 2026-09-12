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
import { RotateSessionUseCase } from '@contexts/iam/application/commands/rotate-session.use-case';

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
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  // View engine first so res.render works in filters/middleware. `configureViewEngine`
  // expects the Express instance, not the Nest app; the HttpAdapter wraps Express.
  configureViewEngine(app.getHttpAdapter().getInstance());

  // Body parsers must run before cookieParser/session/flash/csrf so req.body is
  // populated before csrf reads req.body._csrf.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
  // Nest reverses the global-filters array before selection and picks the first match,
  // where a catch-all `@Catch()` matches everything. Register the catch-all FIRST so
  // that after the internal reverse, the specific ValidationExceptionFilter is checked
  // before the GlobalExceptionFilter — otherwise the catch-all swallows
  // BadRequestExceptions and the @FormView re-render never fires.
  app.useGlobalFilters(new GlobalExceptionFilter(), new ValidationExceptionFilter());
  app.useGlobalInterceptors(new FormViewInterceptor(app.get(Reflector)));

  // Mount the Nest router (controller routes, not-found handler, exception handler) on the
  // Express instance. Without this, every request falls through to Express's default
  // `Cannot GET /…` 404. See the doc comment above for why this is required for tests.
  await app.init();

  return app;
}
