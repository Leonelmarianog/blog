/* eslint-disable @typescript-eslint/no-explicit-any */
import { SuspendUserUseCase } from '@contexts/iam/application/commands/suspend-user.use-case';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { UserSuspended } from '@contexts/iam/domain/events/user-events';
import { InMemoryUserRepository, FakeUnitOfWork, email, name } from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');

function seed() {
  const users = new InMemoryUserRepository();
  const uow = new FakeUnitOfWork();
  return { users, uow, user: User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'AUTHOR', displayName: name('Ada') }) };
}

describe('SuspendUserUseCase', () => {
  it('suspends the target and emits UserSuspended', async () => {
    const { users, uow, user } = seed();
    await users.save(user);
    const useCase = new SuspendUserUseCase(users, uow);
    const result = await useCase.execute({ targetId: user.id, now: NOW });
    expect(result.ok).toBe(true);
    const reloaded = await users.findById(user.id);
    expect(reloaded?.isSuspended()).toBe(true);
    expect(uow.dispatched.some((e) => e instanceof UserSuspended)).toBe(true);
  });

  it('fails when the user is not found', async () => {
    const { users, uow } = seed();
    const useCase = new SuspendUserUseCase(users, uow);
    const result = await useCase.execute({ targetId: 'nope' as any, now: NOW });
    expect(result.ok).toBe(false);
  });
});
