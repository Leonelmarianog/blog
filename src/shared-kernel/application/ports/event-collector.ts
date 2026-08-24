import { DomainEvent } from '../../domain/event';

/**
 * The application's view of an event source. `AggregateRoot` (domain) satisfies
 * this structurally, so the UnitOfWork can collect and dispatch events from any
 * aggregate without depending on the domain `Entity`/`AggregateRoot` base directly.
 */
export interface EventCollector {
  readonly domainEvents: readonly DomainEvent[];
  clearDomainEvents(): void;
}
