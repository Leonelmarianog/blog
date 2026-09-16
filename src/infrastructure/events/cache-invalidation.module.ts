import { Global, Module } from '@nestjs/common';
import { CACHE_INVALIDATION_HANDLERS, UserCacheInvalidationHandler, AssetCacheInvalidationHandler, type CacheInvalidationHandler } from './cache-invalidation.handler';

/**
 * Registers the cache-invalidation handlers under the `CACHE_INVALIDATION_HANDLERS` array token.
 * A single factory provider returns the handler array — Nest's same-token `useExisting` does not
 * aggregate into an array (the last declaration wins), so the multi-provider form is unreliable
 * here. `@Global()` so `EventDispatcher` (provided by `PersistenceModule`) can inject the token
 * without importing this module. `CacheModule` (provides `CACHE`) is `@Global()` too, so the
 * handlers' `@Inject(CACHE)` resolves across module boundaries.
 */
@Global()
@Module({
  providers: [
    UserCacheInvalidationHandler,
    AssetCacheInvalidationHandler,
    {
      provide: CACHE_INVALIDATION_HANDLERS,
      useFactory: (user: UserCacheInvalidationHandler, asset: AssetCacheInvalidationHandler): CacheInvalidationHandler[] => [user, asset],
      inject: [UserCacheInvalidationHandler, AssetCacheInvalidationHandler],
    },
  ],
  exports: [CACHE_INVALIDATION_HANDLERS],
})
export class CacheInvalidationModule {}
