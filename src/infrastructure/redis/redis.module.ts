import { Global, Inject, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { createRedisClient, REDIS_CLIENT, type RedisClient } from './redis.client';
import { CACHE_DB, CACHE_REDIS, createCacheClient } from './cache.client';
import { THROTTLE_DB, THROTTLE_REDIS, createThrottleClient } from './throttle.client';

/**
 * Connects a client on init and closes it on destroy so `app.close()` (used by the integration
 * harness) tears it down. Connect errors are swallowed — readiness rides the db0 ping indicator,
 * and cache/throttle-down must not prevent boot. For db1/db2 the dedicated client also runs
 * `SELECT <n>` once connected (safe on a single-db dedicated client — no concurrent SELECT race).
 */
@Injectable()
class RedisLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: RedisClient) {}

  async onModuleInit(): Promise<void> {
    this.client.on('error', () => { /* surfaced via ping */ });
    await this.client.connect().catch(() => {});
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => {});
  }
}

@Injectable()
class CacheRedisLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(CACHE_REDIS) private readonly client: RedisClient) {}

  async onModuleInit(): Promise<void> {
    this.client.on('error', () => { /* cache miss is non-fatal */ });
    await this.client.connect().catch(() => {});
    await this.client.select(CACHE_DB).catch(() => {});
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => {});
  }
}

@Injectable()
class ThrottleRedisLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(THROTTLE_REDIS) private readonly client: RedisClient) {}

  async onModuleInit(): Promise<void> {
    this.client.on('error', () => { /* fail-open on throttle store down */ });
    await this.client.connect().catch(() => {});
    await this.client.select(THROTTLE_DB).catch(() => {});
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => {});
  }
}

@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT, inject: [ConfigService], useFactory: createRedisClient },
    { provide: CACHE_REDIS, inject: [ConfigService], useFactory: createCacheClient },
    { provide: THROTTLE_REDIS, inject: [ConfigService], useFactory: createThrottleClient },
    RedisLifecycle,
    CacheRedisLifecycle,
    ThrottleRedisLifecycle,
  ],
  exports: [REDIS_CLIENT, CACHE_REDIS, THROTTLE_REDIS],
})
export class RedisModule {}
