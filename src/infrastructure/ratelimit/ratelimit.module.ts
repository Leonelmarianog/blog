import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '../../config/config.service';
import { RedisThrottlerStorageModule } from './redis-throttler-storage.module';
import { RedisThrottlerStorage } from './redis-throttler.storage';
import { AppThrottlerGuard } from './app-throttler.guard';
import { buildThrottlerOptions } from './throttler-options.factory';

/**
 * Wires `ThrottlerModule.forRootAsync` with the named throttlers from config and the Redis-backed
 * storage. `AppThrottlerGuard` is exported for `AppModule` to register as `APP_GUARD`.
 *
 * The `forRootAsync` factory injects `ConfigService` (global, from `ConfigModule`) and
 * `RedisThrottlerStorage` (global, from `RedisThrottlerStorageModule`). Both must be global because
 * Nest resolves the factory's `inject` against the dynamic `ThrottlerModule` injector, which cannot
 * see providers declared only in this module.
 */
@Module({
  imports: [
    RedisThrottlerStorageModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (config: ConfigService, storage: RedisThrottlerStorage) => ({
        throttlers: buildThrottlerOptions(config),
        storage,
      }),
    }),
  ],
  providers: [AppThrottlerGuard],
  exports: [ThrottlerModule, AppThrottlerGuard],
})
export class RateLimitModule {}
