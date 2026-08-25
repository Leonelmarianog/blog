import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { UserId } from '../../domain/user/user.types';
import type { SessionRepositoryPort, TokenHasherPort } from '../ports';
import { RememberMeTokenService } from '../services/remember-me-token.service';

export interface RotateSessionInput {
  series: string;
  token: string;
  now: Date;
}

export interface RotateSessionOutput {
  userId: UserId;
  rememberMeCookie: string;
}

export class RotateSessionUseCase extends UseCase<RotateSessionInput, RotateSessionOutput> {
  constructor(
    private readonly sessions: SessionRepositoryPort,
    private readonly tokenHasher: TokenHasherPort,
    private readonly rememberMe: RememberMeTokenService,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: RotateSessionInput): Promise<Result<RotateSessionOutput, DomainError>> {
    const seriesHash = this.tokenHasher.hash(input.series);
    const session = await this.sessions.findBySeriesHash(seriesHash);
    if (!session) return fail(new DomainError('Invalid remember-me credential'));
    if (session.isExpired(input.now)) return fail(new DomainError('Invalid remember-me credential'));

    const presentedTokenHash = this.tokenHasher.hash(input.token);
    if (!session.matchesToken(presentedTokenHash)) {
      // Theft: a known series with a mismatched token ⇒ invalidate ALL the user's sessions.
      session.revoke();
      this.uow.collect(session);
      await this.uow.run(async (tx) => {
        await this.sessions.deleteByUserId(session.userId, tx);
      });
      return fail(new DomainError('Remember-me credential mismatch; all sessions invalidated'));
    }

    const { token: newToken } = this.rememberMe.rotate(session, input.now);
    this.uow.collect(session);
    await this.uow.run(async (tx) => {
      await this.sessions.update(session, tx);
    });

    return ok({
      userId: session.userId,
      rememberMeCookie: RememberMeTokenService.formatCookie(input.series, newToken),
    });
  }
}
