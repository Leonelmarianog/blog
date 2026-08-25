import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

async function bootstrap(): Promise<void> {
  // Nest registers its default body parsers (express.json/express.urlencoded) in
  // NestApplication.init(), which listen() triggers — AFTER every app.use() below.
  // Disable the defaults and register json/urlencoded explicitly at the top of the
  // chain so req.body is populated before the CSRF middleware reads req.body._csrf.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  // View engine first so res.render works in filters/middleware. `configureViewEngine`
  // expects the Express instance, not the Nest app; the HttpAdapter wraps Express.
  configureViewEngine(app.getHttpAdapter().getInstance());

  // Body parsers must run before cookieParser/session/flash/csrf so req.body is
  // populated before csrf reads req.body._csrf.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Express middleware chain — order matters (spec §11):
  //   bodyParsers -> cookieParser -> session -> remember-me -> flash -> csrf
  // remember-me needs a DI-resolved RotateSessionUseCase, which the composition root
  // can resolve via app.get().
  const rememberMe = new RememberMeMiddleware(app.get(RotateSessionUseCase));
  const flash = new FlashMiddleware();
  const csrf = new CsrfMiddleware();
  app.use(cookieParser());
  app.use(createSessionMiddleware(config));
  // `app.use` on INestApplication is typed `(...args: any[])`, so the inline callback
  // params would be implicit `any` under strict mode. Type them to exactly what each
  // middleware's `use` expects (`Parameters<typeof X.use>`) — the call type-checks
  // directly and no `any` token appears. The middleware `Req`/`Res` are structural
  // minimal shapes; Express's runtime `Request`/`Response` satisfy them at runtime.
  app.use(
    (
      req: Parameters<typeof rememberMe.use>[0],
      res: Parameters<typeof rememberMe.use>[1],
      next: Parameters<typeof rememberMe.use>[2],
    ) => rememberMe.use(req, res, next),
  );
  app.use(
    (req: Parameters<typeof flash.use>[0], res: Parameters<typeof flash.use>[1], next: Parameters<typeof flash.use>[2]) =>
      flash.use(req, res, next),
  );
  app.use(
    (req: Parameters<typeof csrf.use>[0], res: Parameters<typeof csrf.use>[1], next: Parameters<typeof csrf.use>[2]) =>
      csrf.use(req, res, next),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: false }));
  app.useGlobalFilters(new ValidationExceptionFilter(), new GlobalExceptionFilter());
  app.useGlobalInterceptors(new FormViewInterceptor(app.get(Reflector)));

  await app.listen(config.get('PORT'));
}

void bootstrap();
