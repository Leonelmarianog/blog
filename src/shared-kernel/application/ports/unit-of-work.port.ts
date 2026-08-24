export interface UnitOfWorkPort<T> {
  readonly aggregate: T;
  commit(): Promise<void>;
}