import { DomainEvent } from '@kernel/domain';
import type { UserId } from '../user/user.types';

export class UserRegistered extends DomainEvent<'User'> {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class EmailVerified extends DomainEvent<'User'> {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class PasswordReset extends DomainEvent<'User'> {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class UserRoleChanged extends DomainEvent<'User'> {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class UserSuspended extends DomainEvent<'User'> {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class UserUnsuspended extends DomainEvent<'User'> {
  constructor(userId: UserId) {
    super(userId);
  }
}

export class UserProfileUpdated extends DomainEvent<'User'> {
  constructor(userId: UserId) {
    super(userId);
  }
}
