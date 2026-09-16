import { Inject, Injectable } from '@nestjs/common';
import type { DomainEvent } from '@kernel/domain';
import { CACHE, type CachePort } from '@kernel/application';

/**
 * A cache-invalidation handler. `eventTypes` lists each `DomainEvent` constructor name it handles;
 * the dispatcher indexes handlers by these names. A single handler may serve several event types.
 *
 * `handle` takes only the event — the handler injects `CachePort` itself (constructor DI), so the
 * dispatcher does not pass the cache in.
 */
export interface CacheInvalidationHandler {
  readonly eventTypes: readonly string[];
  handle(event: DomainEvent): Promise<void>;
}

export const CACHE_INVALIDATION_HANDLERS = Symbol('CACHE_INVALIDATION_HANDLERS');

/** Invalidation for IAM user events. Key patterns are forward-looking (no consumer yet). */
@Injectable()
export class UserCacheInvalidationHandler implements CacheInvalidationHandler {
  readonly eventTypes = [
    'UserRegistered', 'EmailVerified', 'PasswordReset',
    'UserRoleChanged', 'UserSuspended', 'UserUnsuspended', 'UserProfileUpdated',
  ];

  constructor(@Inject(CACHE) private readonly cache: CachePort) {}

  async handle(event: DomainEvent): Promise<void> {
    const userId = String(event.aggregateId);
    switch (event.constructor.name) {
      case 'UserRoleChanged':
      case 'UserSuspended':
      case 'UserUnsuspended':
      case 'UserProfileUpdated':
        await this.cache.del(`iam:user:${userId}`);
        await this.cache.flushByPrefix('iam:users');
        return;
      case 'UserRegistered':
      case 'EmailVerified':
      case 'PasswordReset':
        await this.cache.flushByPrefix('iam:users');
        return;
      default:
        return;
    }
  }
}

/** Invalidation for Media asset events. */
@Injectable()
export class AssetCacheInvalidationHandler implements CacheInvalidationHandler {
  readonly eventTypes = ['AssetUploaded', 'AssetVariantAdded'];

  constructor(@Inject(CACHE) private readonly cache: CachePort) {}

  async handle(event: DomainEvent): Promise<void> {
    const assetId = String(event.aggregateId);
    await this.cache.del(`media:asset:${assetId}`);
    await this.cache.flushByPrefix('media:assets');
  }
}
