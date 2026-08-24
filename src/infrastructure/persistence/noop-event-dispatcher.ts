import { Injectable } from '@nestjs/common';
import { EventDispatcherPort } from '@kernel/application';
import { DomainEvent } from '@kernel/domain';

/**
 * Default no-op dispatcher. Keeps PrismaUnitOfWork's dependency satisfiable
 * before real event handlers (cache invalidation, queue producers) land in
 * Plan 7. Replaced by a real dispatcher via the EVENT_DISPATCHER token then.
 */
@Injectable()
export class NoopEventDispatcher implements EventDispatcherPort {
  async dispatchAll(_events: readonly DomainEvent[]): Promise<void> {
    // intentionally empty
  }
}
