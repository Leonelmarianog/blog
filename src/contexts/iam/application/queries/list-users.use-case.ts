import { UseCase, ok, fail, type Result } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { Role } from '../../domain/authorization/role';
import type { UserStatus } from '../../domain/user/user-status';
import type { UserId } from '../../domain/user/user.types';
import type { UserRepositoryPort } from '../ports';

export interface ListUsersInput {
  page: number;
  pageSize: number;
}

export interface UserReadModel {
  id: UserId;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  displayName: string;
}

export interface ListUsersOutput {
  items: UserReadModel[];
  total: number;
}

export class ListUsersUseCase extends UseCase<ListUsersInput, ListUsersOutput> {
  constructor(private readonly users: UserRepositoryPort) {
    super();
  }

  async execute(input: ListUsersInput): Promise<Result<ListUsersOutput, DomainError>> {
    if (input.page < 1 || input.pageSize < 1) {
      return fail(new DomainError('Invalid pagination'));
    }
    const { items, total } = await this.users.findMany({ page: input.page, pageSize: input.pageSize });
    return ok({
      items: items.map((u) => ({
        id: u.id,
        email: u.email.value,
        role: u.role,
        status: u.status,
        emailVerified: u.emailVerified,
        displayName: u.displayName.value,
      })),
      total,
    });
  }
}
