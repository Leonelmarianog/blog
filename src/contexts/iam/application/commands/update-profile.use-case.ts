import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import { DisplayName } from '../../domain/user/display-name.vo';
import type { UserId } from '../../domain/user/user.types';
import type { UserRepositoryPort } from '../ports';
import { PasswordHasherService } from '../services/password-hasher.service';

export interface UpdateProfileInput {
  userId: UserId;
  displayName: string;
  newPassword?: string;
}
export interface UpdateProfileOutput {
  userId: UserId;
}

export class UpdateProfileUseCase extends UseCase<UpdateProfileInput, UpdateProfileOutput> {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherService,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: UpdateProfileInput): Promise<Result<UpdateProfileOutput, DomainError>> {
    const user = await this.users.findById(input.userId);
    if (!user) return fail(new DomainError('User not found'));

    const nameResult = DisplayName.create(input.displayName);
    if (!nameResult.ok) return fail(nameResult.error);
    user.changeDisplayName(nameResult.value);

    if (input.newPassword) {
      const newHashed = await this.passwordHasher.hashPassword(input.newPassword);
      user.changePassword(newHashed);
    }

    this.uow.collect(user);
    await this.uow.run(async (tx) => {
      await this.users.update(user, tx);
    });
    return ok({ userId: user.id });
  }
}
