import { Global, Inject, Injectable, Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { createRedisClient, REDIS_CLIENT, type RedisClient } from './redis.client';

/**
 * Connects the client on init and closes it on destroy so `app.close()` (used by the integration
 * harness) tears it down. Connect errors are swallowed — the readiness indicator reports `down`.
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

@Global()
@Module({
  providers: [
    { provide: REDIS_CLIENT, inject: [ConfigService], useFactory: createRedisClient },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
