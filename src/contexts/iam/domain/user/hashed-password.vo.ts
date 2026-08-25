import { ValueObject } from '@kernel/domain';

export class HashedPassword extends ValueObject<string> {
  private constructor(hash: string) {
    super(hash);
  }

  /** Wrap an already-hashed password (from the hasher or from persistence). No validation. */
  static fromHash(hash: string): HashedPassword {
    return new HashedPassword(hash);
  }

  get hash(): string {
    return this.props;
  }
}
