import { Global, Module } from '@nestjs/common';
import { CACHE } from '@kernel/application';
import { RedisCacheAdapter } from './redis-cache.adapter';

@Global()
@Module({
  providers: [{ provide: CACHE, useClass: RedisCacheAdapter }],
  exports: [CACHE],
})
export class CacheModule {}
