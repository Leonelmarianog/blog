import { AggregateRoot, Identifier } from '@kernel/domain';
import { Email } from './email.vo';
import { HashedPassword } from './hashed-password.vo';
import type { Role } from '../authorization/role';
import type { UserStatus } from './user-status';
import type { UserId } from './user.types';
import { UserRegistered, EmailVerified, PasswordReset } from '../events/user-events';

export interface UserProps {
  id: UserId;
  email: Email;
  password: HashedPassword;
  role: Role;
  emailVerified: boolean;
  status: UserStatus;
}

export interface RegisterInput {
  email: Email;
  password: HashedPassword;
  role: Role;
}

export class User extends AggregateRoot<'User'> {
  private _email: Email;
  private _password: HashedPassword;
  private _role: Role;
  private _emailVerified: boolean;
  private _status: UserStatus;

  private constructor(props: UserProps) {
    super(props.id);
    this._email = props.email;
    this._password = props.password;
    this._role = props.role;
    this._emailVerified = props.emailVerified;
    this._status = props.status;
  }

  /** Factory for a brand-new registration. Emits UserRegistered. */
  static register(input: RegisterInput): User {
    const user = new User({
      id: Identifier.generate<'User'>(),
      email: input.email,
      password: input.password,
      role: input.role,
      emailVerified: false,
      status: 'ACTIVE',
    });
    user.addDomainEvent(new UserRegistered(user.id));
    return user;
  }

  /** Reconstitution from persistence (mappers, Plan 4). No events. */
  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get email(): Email { return this._email; }
  get password(): HashedPassword { return this._password; }
  get role(): Role { return this._role; }
  get emailVerified(): boolean { return this._emailVerified; }
  get status(): UserStatus { return this._status; }

  verifyEmail(): void {
    if (!this._emailVerified) {
      this._emailVerified = true;
      this.addDomainEvent(new EmailVerified(this.id));
    }
  }

  changePassword(newHashed: HashedPassword): void {
    this._password = newHashed;
    this.addDomainEvent(new PasswordReset(this.id));
  }

  isSuspended(): boolean {
    return this._status === 'SUSPENDED';
  }

  canLogin(): boolean {
    return this._emailVerified && !this.isSuspended();
  }
}
