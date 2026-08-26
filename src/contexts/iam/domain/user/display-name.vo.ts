import { ValueObject } from '@kernel/domain';
import { DomainError, fail, ok, type Result } from '@kernel/domain';

const MAX = 80;

export class DisplayName extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<DisplayName, DomainError> {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return fail(new DomainError('Display name must not be empty'));
    }
    if (trimmed.length > MAX) {
      return fail(new DomainError(`Display name must be at most ${MAX} characters`));
    }
    return ok(new DisplayName(trimmed));
  }
}
