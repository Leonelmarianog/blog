import { UseCase, ok, fail, type Result } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { UserId } from '../../domain/user/user.types';
import type { Role } from '../../domain/authorization/role';
import type { UserStatus } from '../../domain/user/user-status';
import type { UserRepositoryPort } from '../ports';

export interface GetCurrentUserInput {
  userId: UserId;
}

export interface GetCurrentUserOutput {
  id: UserId;
  email: string;
  role: Role;
  emailVerified: boolean;
  status: UserStatus;
}

export class GetCurrentUserUseCase extends UseCase<GetCurrentUserInput, GetCurrentUserOutput> {
  constructor(private readonly users: UserRepositoryPort) {
    super();
  }

  async execute(input: GetCurrentUserInput): Promise<Result<GetCurrentUserOutput, DomainError>> {
    const user = await this.users.findById(input.userId);
    if (!user) return fail(new DomainError('User not found'));

    return ok({
      id: user.id,
      email: user.email.value,
      role: user.role,
      emailVerified: user.emailVerified,
      status: user.status,
    });
  }
}
