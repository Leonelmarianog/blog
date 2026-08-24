import { DomainEvent } from '../../domain/event';

export const EVENT_DISPATCHER = Symbol('EVENT_DISPATCHER');

export interface EventDispatcherPort {
  dispatchAll(events: readonly DomainEvent[]): Promise<void>;
}
