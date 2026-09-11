import { ListUsersUseCase } from '@contexts/iam/application/queries/list-users.use-case';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { InMemoryUserRepository, email, name } from './fakes';

describe('ListUsersUseCase', () => {
  it('returns a paginated read model of users', async () => {
    const users = new InMemoryUserRepository();
    await users.save(User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'ADMIN', displayName: name('Ada') }));
    await users.save(User.register({ email: email('c@d.com'), password: HashedPassword.fromHash('h'), role: 'READER', displayName: name('Grace') }));

    const useCase = new ListUsersUseCase(users);
    const result = await useCase.execute({ page: 1, pageSize: 10 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.total).toBe(2);
    expect(result.value.items).toHaveLength(2);
    const admin = result.value.items.find((u) => u.role === 'ADMIN')!;
    expect(admin.displayName).toBe('Ada');
    expect(admin.email).toBe('a@b.com');
  });

  it('paginates', async () => {
    const users = new InMemoryUserRepository();
    for (let i = 0; i < 3; i++) {
      await users.save(User.register({ email: email(`u${i}@b.com`), password: HashedPassword.fromHash('h'), role: 'READER', displayName: name(`U${i}`) }));
    }
    const useCase = new ListUsersUseCase(users);
    const result = await useCase.execute({ page: 2, pageSize: 2 });
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.total).toBe(3);
  });
});
