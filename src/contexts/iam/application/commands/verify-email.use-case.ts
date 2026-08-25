import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { UserId } from '../../domain/user/user.types';
import type { TokenRepositoryPort, UserRepositoryPort, TokenHasherPort } from '../ports';

export interface VerifyEmailInput {
  selector: string;
  verifier: string;
  now: Date;
}

export interface VerifyEmailOutput {
  userId: UserId;
}

export class VerifyEmailUseCase extends UseCase<VerifyEmailInput, VerifyEmailOutput> {
  constructor(
    private readonly tokens: TokenRepositoryPort,
    private readonly users: UserRepositoryPort,
    private readonly tokenHasher: TokenHasherPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: VerifyEmailInput): Promise<Result<VerifyEmailOutput, DomainError>> {
    const token = await this.tokens.findBySelector(input.selector);
    if (!token || token.type !== 'VERIFICATION') {
      return fail(new DomainError('Invalid or expired verification token'));
    }
    if (token.isUsed() || token.isExpired(input.now)) {
      return fail(new DomainError('Invalid or expired verification token'));
    }
    if (!this.tokenHasher.verify(input.verifier, token.verifierHash)) {
      return fail(new DomainError('Invalid or expired verification token'));
    }

    const user = await this.users.findById(token.userId);
    if (!user) return fail(new DomainError('User not found'));

    token.consume(input.now);
    user.verifyEmail();

    this.uow.collect(user);
    this.uow.collect(token);
    await this.uow.run(async (tx) => {
      await this.users.update(user, tx);
      await this.tokens.update(token, tx);
    });

    return ok({ userId: user.id });
  }
}
