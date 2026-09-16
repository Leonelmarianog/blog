import { UserCacheInvalidationHandler, AssetCacheInvalidationHandler } from '@infra/events/cache-invalidation.handler';
import { DomainEvent } from '@kernel/domain';

class FakeCache {
  del = jest.fn();
  flushByPrefix = jest.fn();
}
function evt(name: string, id: string): DomainEvent {
  class E extends DomainEvent {
    constructor() {
      super(id as never);
    }
  }
  Object.defineProperty(E, 'name', { value: name });
  return new E();
}

describe('UserCacheInvalidationHandler', () => {
  it('del + flushByPrefix for role/suspend/profile events', async () => {
    const cache = new FakeCache();
    const h = new UserCacheInvalidationHandler(cache as never);
    for (const name of ['UserRoleChanged', 'UserSuspended', 'UserUnsuspended', 'UserProfileUpdated']) {
      cache.del.mockClear();
      cache.flushByPrefix.mockClear();
      await h.handle(evt(name, 'u-9'));
      expect(cache.del).toHaveBeenCalledWith('iam:user:u-9');
      expect(cache.flushByPrefix).toHaveBeenCalledWith('iam:users');
    }
  });

  it('flushByPrefix only for register/verify/reset events', async () => {
    const cache = new FakeCache();
    const h = new UserCacheInvalidationHandler(cache as never);
    for (const name of ['UserRegistered', 'EmailVerified', 'PasswordReset']) {
      cache.del.mockClear();
      cache.flushByPrefix.mockClear();
      await h.handle(evt(name, 'u-9'));
      expect(cache.del).not.toHaveBeenCalled();
      expect(cache.flushByPrefix).toHaveBeenCalledWith('iam:users');
    }
  });
});

describe('AssetCacheInvalidationHandler', () => {
  it('del asset + flush assets prefix', async () => {
    const cache = new FakeCache();
    const h = new AssetCacheInvalidationHandler(cache as never);
    await h.handle(evt('AssetUploaded', 'a-1'));
    expect(cache.del).toHaveBeenCalledWith('media:asset:a-1');
    expect(cache.flushByPrefix).toHaveBeenCalledWith('media:assets');
  });
});
