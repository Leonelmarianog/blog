import { Identifier } from './identifier';
import { DomainEvent } from './event';

export abstract class Entity<B extends string> {
  private readonly _id: Identifier<B>;
  private _domainEvents: DomainEvent[] = [];

  protected constructor(id: Identifier<B>) {
    this._id = id;
  }

  get id(): Identifier<B> {
    return this._id;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  equals(other: Entity<B>): boolean {
    return Identifier.equals(this._id, other._id);
  }
}
