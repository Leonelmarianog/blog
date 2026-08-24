import { Entity } from './entity';

export abstract class AggregateRoot<B extends string> extends Entity<B> {}