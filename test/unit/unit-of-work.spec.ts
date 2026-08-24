import { AggregateRoot, DomainEvent, Identifier } from '@kernel/domain';
import { EventDispatcherPort } from '@kernel/application';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { PrismaUnitOfWork } from '@infra/persistence/unit-of-work';

class FakeEvent extends DomainEvent {}

class FakeAggregate extends AggregateRoot<'Fake'> {
  constructor() {
    super(Identifier.generate<'Fake'>());
  }
  emit(): void {
    this.addDomainEvent(new FakeEvent(this.id));
  }
}

function createUow(dispatched: DomainEvent[][]) {
  const fakePrisma = {
    $transaction: async <T>(work: (tx: unknown) => Promise<T>): Promise<T> => work({}),
  } as unknown as PrismaService;
  const fakeDispatcher: EventDispatcherPort = {
    dispatchAll: async (events) => {
      dispatched.push([...events]);
    },
  };
  return new PrismaUnitOfWork(fakePrisma, fakeDispatcher);
}

describe('PrismaUnitOfWork', () => {
  it('delegates work to $transaction and returns its result', async () => {
    const uow = createUow([]);
    const result = await uow.run(async () => 'ok');
    expect(result).toBe('ok');
  });

  it('dispatches collected events after commit, then clears them', async () => {
    const dispatched: DomainEvent[][] = [];
    const uow = createUow(dispatched);
    const agg = new FakeAggregate();
    agg.emit();
    uow.collect(agg);

    await uow.run(async () => 'ok');

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toHaveLength(1);
    expect(agg.domainEvents).toHaveLength(0);
  });

  it('dispatches an empty list when no aggregates were collected', async () => {
    const dispatched: DomainEvent[][] = [];
    const uow = createUow(dispatched);

    await uow.run(async () => 'ok');

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual([]);
  });

  it('does NOT dispatch on rollback, but clears events and rethrows', async () => {
    const dispatched: DomainEvent[][] = [];
    const uow = createUow(dispatched);
    const agg = new FakeAggregate();
    agg.emit();
    uow.collect(agg);

    await expect(uow.run(async () => { throw new Error('boom'); })).rejects.toThrow('boom');

    expect(dispatched).toHaveLength(0);
    expect(agg.domainEvents).toHaveLength(0);
  });

  it('does not re-dispatch events from a previous run', async () => {
    const dispatched: DomainEvent[][] = [];
    const uow = createUow(dispatched);
    const agg = new FakeAggregate();
    agg.emit();
    uow.collect(agg);

    await uow.run(async () => 'first');
    agg.emit();
    uow.collect(agg);
    await uow.run(async () => 'second');

    expect(dispatched).toHaveLength(2);
    expect(dispatched[0]).toHaveLength(1);
    expect(dispatched[1]).toHaveLength(1);
  });
});
