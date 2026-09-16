import { DynamicModule, Module } from '@nestjs/common';
import { LoggerModule as NestjsPinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '../../config/config.service';
import { buildPinoOptions } from './pino.factory';

/**
 * Wraps nestjs-pino so Nest's own bootstrap/DI logs (route mapping, resolution, exceptions)
 * flow through pino. `autoLogging: false` disables nestjs-pino's request-completion lines — the
 * explicit `pinoHttp(...)` middleware in `create-app.ts` owns request logging (it covers
 * express-middleware 403s and pre-router 404s a router interceptor would miss). Shares the same
 * redact/genReqId config via `buildPinoOptions`.
 */
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        NestjsPinoLoggerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            pinoHttp: { ...buildPinoOptions(config), autoLogging: false },
          }),
        }),
      ],
      exports: [NestjsPinoLoggerModule],
    };
  }
}
