import { UnsuspendUserUseCase } from '@contexts/iam/application/commands/unsuspend-user.use-case';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { UserUnsuspended } from '@contexts/iam/domain/events/user-events';
import { InMemoryUserRepository, FakeUnitOfWork, email, name } from './fakes';

function seed() {
  const users = new InMemoryUserRepository();
  const uow = new FakeUnitOfWork();
  const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'AUTHOR', displayName: name('Ada') });
  user.suspend();
  return { users, uow, user };
}

describe('UnsuspendUserUseCase', () => {
  it('unsuspends the target and emits UserUnsuspended', async () => {
    const { users, uow, user } = seed();
    await users.save(user);
    const useCase = new UnsuspendUserUseCase(users, uow);
    const result = await useCase.execute({ targetId: user.id });
    expect(result.ok).toBe(true);
    const reloaded = await users.findById(user.id);
    expect(reloaded?.isSuspended()).toBe(false);
    expect(uow.dispatched.some((e) => e instanceof UserUnsuspended)).toBe(true);
  });
});
