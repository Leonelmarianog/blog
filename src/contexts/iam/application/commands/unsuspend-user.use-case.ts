import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { UserId } from '../../domain/user/user.types';
import type { UserRepositoryPort } from '../ports';

export interface UnsuspendUserInput {
  targetId: UserId;
}
export interface UnsuspendUserOutput {
  userId: UserId;
}

export class UnsuspendUserUseCase extends UseCase<UnsuspendUserInput, UnsuspendUserOutput> {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: UnsuspendUserInput): Promise<Result<UnsuspendUserOutput, DomainError>> {
    const user = await this.users.findById(input.targetId);
    if (!user) return fail(new DomainError('User not found'));
    user.unsuspend();
    this.uow.collect(user);
    await this.uow.run(async (tx) => {
      await this.users.update(user, tx);
    });
    return ok({ userId: user.id });
  }
}
