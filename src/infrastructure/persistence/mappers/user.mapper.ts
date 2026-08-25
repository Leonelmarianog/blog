import { Identifier } from '@kernel/domain';
import { Email } from '@contexts/iam/domain/user/email.vo';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import type { Role } from '@contexts/iam/domain/authorization/role';
import type { UserStatus } from '@contexts/iam/domain/user/user-status';
import type { UserProps } from '@contexts/iam/domain/user/user.aggregate';
import type { Prisma } from '../prisma/client';

type UserRow = Prisma.UserGetPayload<{}>;

export const UserMapper = {
  toPersistence(user: User): Prisma.UserUncheckedCreateInput {
    return {
      id: user.id,
      email: user.email.value,
      passwordHash: user.password.hash,
      role: user.role,
      emailVerified: user.emailVerified,
      status: user.status,
    };
  },

  toDomain(row: UserRow): User {
    const emailResult = Email.create(row.email);
    if (!emailResult.ok) {
      throw new Error(`Corrupt user row ${row.id}: invalid email "${row.email}"`);
    }
    const props: UserProps = {
      id: Identifier.from<'User'>(row.id),
      email: emailResult.value,
      password: HashedPassword.fromHash(row.passwordHash),
      role: row.role as Role,
      emailVerified: row.emailVerified,
      status: row.status as UserStatus,
    };
    return User.fromPersistence(props);
  },
};
