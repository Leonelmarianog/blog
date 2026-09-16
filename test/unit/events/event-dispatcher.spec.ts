import { EventDispatcher } from '@infra/events/event-dispatcher';
import type { CacheInvalidationHandler } from '@infra/events/cache-invalidation.handler';
import { DomainEvent } from '@kernel/domain';

class FakeLogger {
  error = jest.fn();
}

class UserRegistered extends DomainEvent {
  constructor() {
    super('u-1' as never);
  }
}
class AssetUploaded extends DomainEvent {
  constructor() {
    super('a-1' as never);
  }
}
class UnknownEvent extends DomainEvent {
  constructor() {
    super('x-1' as never);
  }
}

describe('EventDispatcher', () => {
  it('routes each event to handlers registered for its constructor.name', async () => {
    const userHandler: CacheInvalidationHandler = {
      eventTypes: ['UserRegistered'],
      handle: jest.fn(),
    };
    const assetHandler: CacheInvalidationHandler = {
      eventTypes: ['AssetUploaded'],
      handle: jest.fn(),
    };
    const logger = new FakeLogger();
    const dispatcher = new EventDispatcher([userHandler, assetHandler], logger as never);

    await dispatcher.dispatchAll([new UserRegistered(), new AssetUploaded()]);

    expect(userHandler.handle).toHaveBeenCalledTimes(1);
    expect(assetHandler.handle).toHaveBeenCalledTimes(1);
  });

  it('ignores events with no registered handler', async () => {
    const handler: CacheInvalidationHandler = { eventTypes: ['UserRegistered'], handle: jest.fn() };
    const dispatcher = new EventDispatcher([handler], new FakeLogger() as never);
    await dispatcher.dispatchAll([new UnknownEvent()]);
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('swallows a handler throw (best-effort) and logs it', async () => {
    const handler: CacheInvalidationHandler = {
      eventTypes: ['UserRegistered'],
      handle: jest.fn().mockRejectedValue(new Error('boom')),
    };
    const logger = new FakeLogger();
    const dispatcher = new EventDispatcher([handler], logger as never);
    await expect(dispatcher.dispatchAll([new UserRegistered()])).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
