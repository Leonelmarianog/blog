import { Identifier } from './identifier';

export abstract class DomainEvent {
  readonly occurredAt: Date;

  constructor(readonly aggregateId: Identifier<string>) {
    this.occurredAt = new Date();
  }
}