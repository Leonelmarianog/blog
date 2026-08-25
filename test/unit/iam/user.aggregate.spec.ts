import { Email } from '@contexts/iam/domain/user/email.vo';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { UserRegistered, EmailVerified, PasswordReset } from '@contexts/iam/domain/events/user-events';

function email(value: string): Email {
  const r = Email.create(value);
  if (!r.ok) throw new Error('test fixture: bad email');
  return r.value;
}

describe('User aggregate', () => {
  it('register creates a new active, unverified user and emits UserRegistered', () => {
    const user = User.register({
      email: email('a@b.com'),
      password: HashedPassword.fromHash('h'),
      role: 'READER',
    });
    expect(user.email.value).toBe('a@b.com');
    expect(user.role).toBe('READER');
    expect(user.emailVerified).toBe(false);
    expect(user.status).toBe('ACTIVE');
    expect(user.domainEvents.some((e) => e instanceof UserRegistered)).toBe(true);
  });

  it('fromPersistence reconstitutes a user without emitting events', () => {
    const user = User.fromPersistence({
      id: 'u1' as never,
      email: email('a@b.com'),
      password: HashedPassword.fromHash('h'),
      role: 'AUTHOR',
      emailVerified: true,
      status: 'ACTIVE',
    });
    expect(user.id).toBe('u1');
    expect(user.emailVerified).toBe(true);
    expect(user.domainEvents).toHaveLength(0);
  });

  it('verifyEmail sets the flag and emits EmailVerified once (idempotent)', () => {
    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER' });
    user.clearDomainEvents();

    user.verifyEmail();
    expect(user.emailVerified).toBe(true);
    expect(user.domainEvents.filter((e) => e instanceof EmailVerified)).toHaveLength(1);

    user.verifyEmail(); // idempotent: no second event
    expect(user.domainEvents.filter((e) => e instanceof EmailVerified)).toHaveLength(1);
  });

  it('changePassword updates the hash and emits PasswordReset', () => {
    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('old'), role: 'READER' });
    user.clearDomainEvents();

    user.changePassword(HashedPassword.fromHash('new'));
    expect(user.password.hash).toBe('new');
    expect(user.domainEvents.some((e) => e instanceof PasswordReset)).toBe(true);
  });

  it('canLogin is true only when verified and active', () => {
    const unverified = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER' });
    expect(unverified.canLogin()).toBe(false);

    unverified.verifyEmail();
    expect(unverified.canLogin()).toBe(true);

    const suspended = User.fromPersistence({
      id: 'u2' as never, email: email('c@d.com'), password: HashedPassword.fromHash('h'),
      role: 'READER', emailVerified: true, status: 'SUSPENDED',
    });
    expect(suspended.canLogin()).toBe(false);
    expect(suspended.isSuspended()).toBe(true);
  });
});
