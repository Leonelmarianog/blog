import { EventCollector } from './event-collector';

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');

/**
 * Generic over the transaction client type `Tx` so the kernel stays
 * ORM-agnostic. The Prisma implementation binds `Tx = Prisma.TransactionClient`.
 */
export interface UnitOfWorkPort<Tx> {
  collect(aggregate: EventCollector): void;
  run<T>(work: (tx: Tx) => Promise<T>): Promise<T>;
}
