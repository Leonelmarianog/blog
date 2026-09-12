import { UserMapper } from '@infra/persistence/mappers/user.mapper';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { email, name } from './fakes';

describe('UserMapper', () => {
  it('round-trips displayName through persistence and back', () => {
    const user = User.register({
      email: email('a@b.com'),
      password: HashedPassword.fromHash('h'),
      role: 'READER',
      displayName: name('Ada'),
    });
    const row = UserMapper.toPersistence(user);
    expect(row.displayName).toBe('Ada');

    const back = UserMapper.toDomain({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      displayName: row.displayName,
      emailVerified: false,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(back.displayName.value).toBe('Ada');
  });
});
