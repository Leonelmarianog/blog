import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import { Email } from '../../domain/user/email.vo';
import type { UserId } from '../../domain/user/user.types';
import type { UserRepositoryPort, SessionRepositoryPort } from '../ports';
import { PasswordHasherService } from '../services/password-hasher.service';
import { RememberMeTokenService } from '../services/remember-me-token.service';

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
  now: Date;
}

export interface LoginOutput {
  userId: UserId;
  rememberMeCookie: string | null;
}

export class LoginUseCase extends UseCase<LoginInput, LoginOutput> {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherService,
    private readonly rememberMe: RememberMeTokenService,
    private readonly sessions: SessionRepositoryPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: LoginInput): Promise<Result<LoginOutput, DomainError>> {
    const emailResult = Email.create(input.email);
    if (!emailResult.ok) return fail(new DomainError('Invalid credentials'));
    const email = emailResult.value;

    const user = await this.users.findByEmail(email);
    if (!user) return fail(new DomainError('Invalid credentials'));

    const passwordOk = await this.passwordHasher.verifyPassword(input.password, user.password);
    if (!passwordOk) return fail(new DomainError('Invalid credentials'));

    if (!user.canLogin()) {
      return fail(
        new DomainError(user.isSuspended() ? 'Account suspended' : 'Email not verified'),
      );
    }

    let rememberMeCookie: string | null = null;
    if (input.rememberMe) {
      const { session, series, token } = this.rememberMe.createSession(user.id, input.now);
      rememberMeCookie = RememberMeTokenService.formatCookie(series, token);
      this.uow.collect(session);
      await this.uow.run(async (tx) => {
        await this.sessions.save(session, tx);
      });
    }

    return ok({ userId: user.id, rememberMeCookie });
  }
}
