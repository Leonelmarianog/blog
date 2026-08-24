import { AggregateRoot, DomainEvent, Identifier } from '@kernel/domain';
import {
  EventCollector,
  UnitOfWorkPort,
  EventDispatcherPort,
  EVENT_DISPATCHER,
} from '@kernel/application';

class FakeEvent extends DomainEvent {}

class FakeAggregate extends AggregateRoot<'Fake'> {
  constructor() {
    super(Identifier.generate<'Fake'>());
  }
  emit(): void {
    this.addDomainEvent(new FakeEvent(this.id));
  }
}

describe('kernel persistence ports', () => {
  it('AggregateRoot satisfies EventCollector', () => {
    const a: EventCollector = new FakeAggregate();
    (a as FakeAggregate).emit();
    expect(a.domainEvents).toHaveLength(1);
    a.clearDomainEvents();
    expect(a.domainEvents).toHaveLength(0);
  });

  it('EVENT_DISPATCHER is a unique symbol', () => {
    expect(typeof EVENT_DISPATCHER).toBe('symbol');
    expect(EVENT_DISPATCHER).not.toBe(Symbol('EVENT_DISPATCHER'));
  });

  it('a fake UnitOfWorkPort compiles and runs', async () => {
    const uow: UnitOfWorkPort<unknown> = {
      collect: () => undefined,
      run: async (work) => work(null as never),
    };
    const result = await uow.run(async () => 42);
    expect(result).toBe(42);
  });

  it('a fake EventDispatcherPort records dispatched events', async () => {
    const dispatched: (readonly DomainEvent[])[] = [];
    const dispatcher: EventDispatcherPort = {
      dispatchAll: async (events) => {
        dispatched.push(events);
      },
    };
    await dispatcher.dispatchAll([new FakeEvent(Identifier.from('x'))]);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toHaveLength(1);
  });
});
