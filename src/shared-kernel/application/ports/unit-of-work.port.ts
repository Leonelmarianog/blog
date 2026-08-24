import { EventCollector } from './event-collector';

/**
 * Generic over the transaction client type `Tx` so the kernel stays
 * ORM-agnostic. The Prisma implementation binds `Tx = Prisma.TransactionClient`.
 *
 * Usage: register aggregates whose events should be dispatched after commit via
 * `collect`, then run the transactional work via `run`. On commit the UoW
 * dispatches collected events; on rollback it clears them without dispatching.
 */
export interface UnitOfWorkPort<Tx> {
  collect(aggregate: EventCollector): void;
  run<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
}
