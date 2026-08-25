import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { UserId } from '../../domain/user/user.types';
import type {
  TokenRepositoryPort,
  UserRepositoryPort,
  SessionRepositoryPort,
  TokenHasherPort,
} from '../ports';
import { PasswordHasherService } from '../services/password-hasher.service';

export interface ResetPasswordInput {
  selector: string;
  verifier: string;
  newPassword: string;
  now: Date;
}

export interface ResetPasswordOutput {
  userId: UserId;
}

export class ResetPasswordUseCase extends UseCase<ResetPasswordInput, ResetPasswordOutput> {
  constructor(
    private readonly tokens: TokenRepositoryPort,
    private readonly users: UserRepositoryPort,
    private readonly sessions: SessionRepositoryPort,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenHasher: TokenHasherPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: ResetPasswordInput): Promise<Result<ResetPasswordOutput, DomainError>> {
    const token = await this.tokens.findBySelector(input.selector);
    if (!token || token.type !== 'RESET') {
      return fail(new DomainError('Invalid or expired reset token'));
    }
    if (token.isUsed() || token.isExpired(input.now)) {
      return fail(new DomainError('Invalid or expired reset token'));
    }
    if (!this.tokenHasher.verify(input.verifier, token.verifierHash)) {
      return fail(new DomainError('Invalid or expired reset token'));
    }

    const user = await this.users.findById(token.userId);
    if (!user) return fail(new DomainError('User not found'));

    const newHashed = await this.passwordHasher.hashPassword(input.newPassword);
    user.changePassword(newHashed);
    token.consume(input.now);

    this.uow.collect(user);
    this.uow.collect(token);
    await this.uow.run(async (tx) => {
      await this.users.update(user, tx);
      await this.tokens.update(token, tx);
      // spec §6: password reset invalidates all the user's active sessions.
      await this.sessions.deleteByUserId(user.id, tx);
    });

    return ok({ userId: user.id });
  }
}
