import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EventDispatcherPort } from '@kernel/application';
import type { DomainEvent } from '@kernel/domain';
import { CACHE_INVALIDATION_HANDLERS, type CacheInvalidationHandler } from './cache-invalidation.handler';

/**
 * Real dispatcher. Builds a `Map<constructor.name, CacheInvalidationHandler[]>` from the registry
 * at construction; `dispatchAll` invokes each handler registered for an event's constructor name.
 * Best-effort: a handler throw is logged and swallowed — invalidation must never fail the request
 * (dispatch runs after commit, so a throw can't roll back, but we catch to avoid a 500).
 */
@Injectable()
export class EventDispatcher implements EventDispatcherPort {
  private readonly byType: Map<string, CacheInvalidationHandler[]>;

  constructor(
    @Inject(CACHE_INVALIDATION_HANDLERS) handlers: CacheInvalidationHandler[],
    @Inject(PinoLogger) private readonly logger: PinoLogger,
  ) {
    this.byType = new Map();
    for (const h of handlers) {
      for (const t of h.eventTypes) {
        const list = this.byType.get(t) ?? [];
        list.push(h);
        this.byType.set(t, list);
      }
    }
  }

  async dispatchAll(events: readonly DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.byType.get(event.constructor.name);
      if (!handlers) continue;
      for (const h of handlers) {
        try {
          await h.handle(event);
        } catch (err) {
          this.logger.error({ err, eventType: event.constructor.name }, 'cache invalidation handler threw');
        }
      }
    }
  }
}
