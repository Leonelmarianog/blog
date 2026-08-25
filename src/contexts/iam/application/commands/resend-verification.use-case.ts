import { UseCase, ok, type Result, type DomainError, type UnitOfWorkPort } from '@kernel/application';
import { Email } from '../../domain/user/email.vo';
import type { UserRepositoryPort, TokenRepositoryPort, QueueProducerPort } from '../ports';
import { TokenService } from '../services/token.service';

export interface ResendVerificationInput {
  email: string;
  now: Date;
}

export interface ResendVerificationOutput {
  enqueued: boolean;
}

export class ResendVerificationUseCase extends UseCase<ResendVerificationInput, ResendVerificationOutput> {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly tokens: TokenRepositoryPort,
    private readonly tokenService: TokenService,
    private readonly queue: QueueProducerPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: ResendVerificationInput): Promise<Result<ResendVerificationOutput, DomainError>> {
    // Anti-enumeration: an invalid/unknown/already-verified email all return the
    // same success with enqueued:false — the controller shows one generic flash.
    const emailResult = Email.create(input.email);
    if (!emailResult.ok) return ok({ enqueued: false });

    const user = await this.users.findByEmail(emailResult.value);
    if (!user || user.emailVerified) return ok({ enqueued: false });

    const { token, selector, verifier } = this.tokenService.issue('VERIFICATION', user.id, input.now);
    this.uow.collect(token);
    await this.uow.run(async (tx) => {
      await this.tokens.save(token, tx);
      await this.queue.enqueueVerificationEmail({
        userId: user.id,
        to: user.email.value,
        tokenSelector: selector,
        tokenVerifier: verifier,
      });
    });

    return ok({ enqueued: true });
  }
}
