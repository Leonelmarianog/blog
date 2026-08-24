export abstract class ValueObject<T> {
  protected constructor(readonly props: T) {}

  get value(): T {
    return this.props;
  }

  equals(other: ValueObject<T>): boolean {
    if (this === other) return true;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}