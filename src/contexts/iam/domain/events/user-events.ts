import { DomainEvent } from '@kernel/domain';
import type { UserId } from '../user/user.types';

export class UserRegistered extends DomainEvent {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class EmailVerified extends DomainEvent {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class PasswordReset extends DomainEvent {
  constructor(userId: UserId) {
    super(userId);
  }
}
