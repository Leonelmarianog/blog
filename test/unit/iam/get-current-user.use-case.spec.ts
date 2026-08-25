import { GetCurrentUserUseCase } from '@contexts/iam/application/queries/get-current-user.use-case';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { email, InMemoryUserRepository } from './fakes';

describe('GetCurrentUserUseCase', () => {
  it('returns a flattened read DTO for an existing user', async () => {
    const users = new InMemoryUserRepository();
    const user = User.register({
      email: email('a@b.com'),
      password: HashedPassword.fromHash('h'),
      role: 'AUTHOR',
    });
    user.verifyEmail();
    await users.save(user);
    const useCase = new GetCurrentUserUseCase(users);

    const result = await useCase.execute({ userId: user.id });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      id: user.id,
      email: 'a@b.com',
      role: 'AUTHOR',
      emailVerified: true,
      status: 'ACTIVE',
    });
  });

  it('fails when the user does not exist', async () => {
    const users = new InMemoryUserRepository();
    const useCase = new GetCurrentUserUseCase(users);
    const result = await useCase.execute({ userId: 'nope' as never });
    expect(result.ok).toBe(false);
  });
});
