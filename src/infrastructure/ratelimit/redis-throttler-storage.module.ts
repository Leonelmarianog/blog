import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RedisThrottlerStorage } from './redis-throttler.storage';

/**
 * `@Global()` provider for `RedisThrottlerStorage`. `ThrottlerModule.forRootAsync` resolves its
 * factory `inject` against the dynamic `ThrottlerModule` injector, not `RateLimitModule`'s, so a
 * provider declared only in `RateLimitModule` is invisible there. Making the storage global lets
 * the factory inject it. `RedisModule` is imported (not just relied on as global) so the
 * `THROTTLE_REDIS` token the storage injects is registered even in isolated tests that don't pull
 * in the full `AppModule`.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class RedisThrottlerStorageModule {}
