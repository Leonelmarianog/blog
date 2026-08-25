import { UseCase, ok, type Result, type DomainError, type UnitOfWorkPort } from '@kernel/application';
import type { SessionRepositoryPort, TokenHasherPort } from '../ports';

export interface LogoutInput {
  series: string;
}

export type LogoutOutput = Record<string, never>;

export class LogoutUseCase extends UseCase<LogoutInput, LogoutOutput> {
  constructor(
    private readonly sessions: SessionRepositoryPort,
    private readonly tokenHasher: TokenHasherPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: LogoutInput): Promise<Result<LogoutOutput, DomainError>> {
    const seriesHash = this.tokenHasher.hash(input.series);
    const session = await this.sessions.findBySeriesHash(seriesHash);
    if (!session) return ok({}); // nothing to destroy

    session.revoke();
    this.uow.collect(session);
    await this.uow.run(async (tx) => {
      await this.sessions.delete(session.id, tx);
    });

    return ok({});
  }
}
