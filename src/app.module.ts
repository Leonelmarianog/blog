import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { CryptoModule } from './infrastructure/crypto/crypto.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { StorageModule } from './infrastructure/storage/storage.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { CacheModule } from './infrastructure/cache/cache.module';
import { RateLimitModule } from './infrastructure/ratelimit/ratelimit.module';
import { CacheInvalidationModule } from './infrastructure/events/cache-invalidation.module';
import { AppThrottlerGuard } from './infrastructure/ratelimit/app-throttler.guard';
import { IamModule } from './contexts/iam/presentation/http/iam.module';
import { MediaModule } from './contexts/media/presentation/http/media.module';
import { SharedAuthzModule } from '@kernel/application/authorization';
import { LoggerModule } from './bootstrap/logging/logger.module';
import { HealthModule } from './bootstrap/health/health.module';

// QueueModule is @Global and provides QUEUE_PRODUCER (useClass: LoggingQueueProducer).
// IamModule also binds QUEUE_PRODUCER locally — the local binding shadows the global
// cleanly, and this redundancy is intentional.
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRoot(),
    SharedAuthzModule,
    PersistenceModule,
    CryptoModule,
    QueueModule,
    StorageModule,
    RedisModule,
    CacheModule,
    RateLimitModule,
    CacheInvalidationModule,
    IamModule,
    MediaModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
