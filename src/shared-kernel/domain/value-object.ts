import { isDeepStrictEqual } from 'node:util';

export abstract class ValueObject<T> {
  protected constructor(readonly props: T) {}

  get value(): T {
    return this.props;
  }

  equals(other: ValueObject<T>): boolean {
    if (this === other) return true;
    return isDeepStrictEqual(this.props, other.props);
  }
}
