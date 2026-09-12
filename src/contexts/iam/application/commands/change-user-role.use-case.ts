import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { Role } from '../../domain/authorization/role';
import type { UserId } from '../../domain/user/user.types';
import type { UserRepositoryPort, SessionRepositoryPort } from '../ports';

export interface ChangeUserRoleInput {
  targetId: UserId;
  newRole: Role;
  now: Date;
}
export interface ChangeUserRoleOutput {
  userId: UserId;
}

export class ChangeUserRoleUseCase extends UseCase<ChangeUserRoleInput, ChangeUserRoleOutput> {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly sessions: SessionRepositoryPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: ChangeUserRoleInput): Promise<Result<ChangeUserRoleOutput, DomainError>> {
    const user = await this.users.findById(input.targetId);
    if (!user) return fail(new DomainError('User not found'));
    user.changeRole(input.newRole);
    this.uow.collect(user);
    await this.uow.run(async (tx) => {
      await this.users.update(user, tx);
      // Invalidate the target's sessions so they re-login and pick up the new role
      // (the session carries a denormalized role; see spec §3). Same primitive as
      // ResetPasswordUseCase.
      await this.sessions.deleteByUserId(user.id, tx);
    });
    return ok({ userId: user.id });
  }
}
