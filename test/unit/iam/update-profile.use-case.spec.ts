import { UpdateProfileUseCase } from '@contexts/iam/application/commands/update-profile.use-case';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { UserProfileUpdated, PasswordReset } from '@contexts/iam/domain/events/user-events';
import { PasswordHasherService } from '@contexts/iam/application/services/password-hasher.service';
import { InMemoryUserRepository, FakeUnitOfWork, FakePasswordHasher, email, name } from './fakes';

function seed() {
  const users = new InMemoryUserRepository();
  const uow = new FakeUnitOfWork();
  const passwordHasher = new PasswordHasherService(new FakePasswordHasher());
  const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('old'), role: 'READER', displayName: name('Ada') });
  return { users, uow, passwordHasher, user };
}

describe('UpdateProfileUseCase', () => {
  it('updates the display name', async () => {
    const { users, uow, passwordHasher, user } = seed();
    await users.save(user);
    const useCase = new UpdateProfileUseCase(users, passwordHasher, uow);
    const result = await useCase.execute({ userId: user.id, displayName: 'Grace' });
    expect(result.ok).toBe(true);
    const reloaded = await users.findById(user.id);
    expect(reloaded?.displayName.value).toBe('Grace');
    expect(reloaded?.password.hash).toBe('old'); // unchanged
    expect(uow.dispatched.some((e) => e instanceof UserProfileUpdated)).toBe(true);
  });

  it('also changes the password when newPassword is provided', async () => {
    const { users, uow, passwordHasher, user } = seed();
    await users.save(user);
    const useCase = new UpdateProfileUseCase(users, passwordHasher, uow);
    const result = await useCase.execute({ userId: user.id, displayName: 'Grace', newPassword: 'newpw' });
    expect(result.ok).toBe(true);
    const reloaded = await users.findById(user.id);
    expect(reloaded?.password.hash).toBe('hashed:newpw');
    expect(uow.dispatched.some((e) => e instanceof PasswordReset)).toBe(true);
  });

  it('fails on an invalid display name', async () => {
    const { users, uow, passwordHasher, user } = seed();
    await users.save(user);
    const useCase = new UpdateProfileUseCase(users, passwordHasher, uow);
    const result = await useCase.execute({ userId: user.id, displayName: '   ' });
    expect(result.ok).toBe(false);
  });
});
