import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { UserRegistered, EmailVerified, PasswordReset, UserRoleChanged, UserSuspended, UserUnsuspended, UserProfileUpdated } from '@contexts/iam/domain/events/user-events';
import { email, name } from './fakes';

describe('User aggregate', () => {
  it('register creates a new active, unverified user and emits UserRegistered', () => {
    const user = User.register({
      email: email('a@b.com'),
      password: HashedPassword.fromHash('h'),
      role: 'READER',
      displayName: name('Ada'),
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
      displayName: name('Ada'),
    });
    expect(user.id).toBe('u1');
    expect(user.emailVerified).toBe(true);
    expect(user.domainEvents).toHaveLength(0);
  });

  it('verifyEmail sets the flag and emits EmailVerified once (idempotent)', () => {
    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER', displayName: name('Ada') });
    user.clearDomainEvents();

    user.verifyEmail();
    expect(user.emailVerified).toBe(true);
    expect(user.domainEvents.filter((e) => e instanceof EmailVerified)).toHaveLength(1);

    user.verifyEmail(); // idempotent: no second event
    expect(user.domainEvents.filter((e) => e instanceof EmailVerified)).toHaveLength(1);
  });

  it('changePassword updates the hash and emits PasswordReset', () => {
    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('old'), role: 'READER', displayName: name('Ada') });
    user.clearDomainEvents();

    user.changePassword(HashedPassword.fromHash('new'));
    expect(user.password.hash).toBe('new');
    expect(user.domainEvents.some((e) => e instanceof PasswordReset)).toBe(true);
  });

  it('canLogin is true only when verified and active', () => {
    const unverified = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER', displayName: name('Ada') });
    expect(unverified.canLogin()).toBe(false);

    unverified.verifyEmail();
    expect(unverified.canLogin()).toBe(true);

    const suspended = User.fromPersistence({
      id: 'u2' as never, email: email('c@d.com'), password: HashedPassword.fromHash('h'),
      role: 'READER', emailVerified: true, status: 'SUSPENDED', displayName: name('Ada'),
    });
    expect(suspended.canLogin()).toBe(false);
    expect(suspended.isSuspended()).toBe(true);
  });
});

function makeUser(role: 'ADMIN' | 'AUTHOR' | 'READER' = 'READER') {
  return User.register({
    email: email('a@b.com'),
    password: HashedPassword.fromHash('h'),
    role,
    displayName: name('Ada'),
  });
}

describe('User aggregate (Plan 5)', () => {
  it('register stores the display name', () => {
    const u = makeUser();
    expect(u.displayName.value).toBe('Ada');
  });

  it('changeRole sets the role and emits UserRoleChanged', () => {
    const u = makeUser('READER');
    u.changeRole('ADMIN');
    expect(u.role).toBe('ADMIN');
    expect(u.domainEvents.some((e) => e instanceof UserRoleChanged)).toBe(true);
  });

  it('suspend sets status SUSPENDED and emits UserSuspended', () => {
    const u = makeUser();
    expect(u.isSuspended()).toBe(false);
    u.suspend();
    expect(u.isSuspended()).toBe(true);
    expect(u.canLogin()).toBe(false);
    expect(u.domainEvents.some((e) => e instanceof UserSuspended)).toBe(true);
  });

  it('unsuspend sets status ACTIVE and emits UserUnsuspended', () => {
    const u = makeUser();
    u.suspend();
    u.unsuspend();
    expect(u.isSuspended()).toBe(false);
    expect(u.domainEvents.some((e) => e instanceof UserUnsuspended)).toBe(true);
  });

  it('changeDisplayName updates the name and emits UserProfileUpdated', () => {
    const u = makeUser();
    u.changeDisplayName(name('Grace'));
    expect(u.displayName.value).toBe('Grace');
    expect(u.domainEvents.some((e) => e instanceof UserProfileUpdated)).toBe(true);
  });
});
