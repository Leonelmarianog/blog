import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_DISPATCHER,
  EventDispatcherPort,
  EventCollector,
  UnitOfWorkPort,
} from '@kernel/application';
import { Prisma } from './prisma/client';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class PrismaUnitOfWork implements UnitOfWorkPort<Prisma.TransactionClient> {
  private readonly aggregates: EventCollector[] = [];

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_DISPATCHER) private readonly dispatcher: EventDispatcherPort,
  ) {}

  collect(aggregate: EventCollector): void {
    this.aggregates.push(aggregate);
  }

  async run<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      const result = await this.prisma.$transaction(async (tx) => work(tx));
      await this.dispatchCollected();
      return result;
    } catch (error) {
      this.clearCollected();
      throw error;
    }
  }

  private async dispatchCollected(): Promise<void> {
    const events = this.aggregates.flatMap((a) => [...a.domainEvents]);
    await this.dispatcher.dispatchAll(events);
    for (const a of this.aggregates) a.clearDomainEvents();
    this.aggregates.length = 0;
  }

  private clearCollected(): void {
    for (const a of this.aggregates) a.clearDomainEvents();
    this.aggregates.length = 0;
  }
}
