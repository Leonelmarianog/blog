import { Identifier } from './identifier';

export abstract class DomainEvent<B extends string = string> {
  readonly occurredAt: Date;

  constructor(readonly aggregateId: Identifier<B>) {
    this.occurredAt = new Date();
  }
}
