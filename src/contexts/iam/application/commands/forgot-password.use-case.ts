import { UseCase, ok, type Result, type DomainError, type UnitOfWorkPort } from '@kernel/application';
import { Email } from '../../domain/user/email.vo';
import type { UserRepositoryPort, TokenRepositoryPort, QueueProducerPort } from '../ports';
import { TokenService } from '../services/token.service';

export interface ForgotPasswordInput {
  email: string;
  now: Date;
}

export interface ForgotPasswordOutput {
  enqueued: boolean;
}

export class ForgotPasswordUseCase extends UseCase<ForgotPasswordInput, ForgotPasswordOutput> {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly tokens: TokenRepositoryPort,
    private readonly tokenService: TokenService,
    private readonly queue: QueueProducerPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: ForgotPasswordInput): Promise<Result<ForgotPasswordOutput, DomainError>> {
    // Anti-enumeration: invalid/unknown emails return the same success with no email.
    const emailResult = Email.create(input.email);
    if (!emailResult.ok) return ok({ enqueued: false });

    const user = await this.users.findByEmail(emailResult.value);
    if (!user) return ok({ enqueued: false });

    const { token, selector, verifier } = this.tokenService.issue('RESET', user.id, input.now);
    this.uow.collect(token);
    await this.uow.run(async (tx) => {
      await this.tokens.save(token, tx);
      await this.queue.enqueueResetEmail({
        userId: user.id,
        to: user.email.value,
        tokenSelector: selector,
        tokenVerifier: verifier,
      });
    });

    return ok({ enqueued: true });
  }
}
