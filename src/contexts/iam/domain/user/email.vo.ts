import { ValueObject } from '@kernel/domain';
import { DomainError, fail, ok, type Result } from '@kernel/domain';

// Pragmatic RFC 5322-ish: local@domain, single @, non-empty parts, domain has a dot.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email extends ValueObject<string> {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<Email, DomainError> {
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      return fail(new DomainError(`Invalid email: "${value}"`));
    }
    return ok(new Email(normalized));
  }
}