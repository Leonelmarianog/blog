import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import { Email } from '../../domain/user/email.vo';
import { User } from '../../domain/user/user.aggregate';
import type { UserId } from '../../domain/user/user.types';
import type { UserRepositoryPort, TokenRepositoryPort, QueueProducerPort } from '../ports';
import { PasswordHasherService } from '../services/password-hasher.service';
import { TokenService } from '../services/token.service';

export interface RegisterInput {
  email: string;
  password: string;
  now: Date;
}

export interface RegisterOutput {
  userId: UserId;
}

export class RegisterUseCase extends UseCase<RegisterInput, RegisterOutput> {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly tokens: TokenRepositoryPort,
    private readonly tokenService: TokenService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly queue: QueueProducerPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: RegisterInput): Promise<Result<RegisterOutput, DomainError>> {
    const emailResult = Email.create(input.email);
    if (!emailResult.ok) return fail(emailResult.error);
    const email = emailResult.value;

    const existing = await this.users.findByEmail(email);
    if (existing) return fail(new DomainError('Email already registered'));

    const password = await this.passwordHasher.hashPassword(input.password);
    const user = User.register({ email, password, role: 'READER' });
    const { token, selector, verifier } = this.tokenService.issue('VERIFICATION', user.id, input.now);

    this.uow.collect(user);
    this.uow.collect(token);
    const userId = await this.uow.run(async (tx) => {
      await this.users.save(user, tx);
      await this.tokens.save(token, tx);
      await this.queue.enqueueVerificationEmail({
        userId: user.id,
        to: email.value,
        tokenSelector: selector,
        tokenVerifier: verifier,
      });
      return user.id;
    });

    return ok({ userId });
  }
}
