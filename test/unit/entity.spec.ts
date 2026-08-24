import { AggregateRoot, DomainEvent, Identifier, Entity } from '@kernel/domain';

class Created extends DomainEvent {}

class Widget extends AggregateRoot<'Widget'> {
  constructor(id: Identifier<'Widget'>) {
    super(id);
  }
  emit(): void {
    this.addDomainEvent(new Created(this.id));
  }
}

describe('Entity / AggregateRoot', () => {
  it('exposes its id', () => {
    const id = Identifier.from<'Widget'>('w1');
    expect(new Widget(id).id).toBe(id);
  });

  it('equals by id', () => {
    const a = new Widget(Identifier.from<'Widget'>('x'));
    const b = new Widget(Identifier.from<'Widget'>('x'));
    const c = new Widget(Identifier.from<'Widget'>('y'));
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('collects and clears domain events', () => {
    const w = new Widget(Identifier.from<'Widget'>('w1'));
    expect(w.domainEvents).toHaveLength(0);
    w.emit();
    expect(w.domainEvents).toHaveLength(1);
    w.clearDomainEvents();
    expect(w.domainEvents).toHaveLength(0);
  });
});