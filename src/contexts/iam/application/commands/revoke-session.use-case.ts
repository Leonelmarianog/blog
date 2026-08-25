import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { SessionId } from '../../domain/session/session.types';
import type { SessionRepositoryPort } from '../ports';

export interface RevokeSessionInput {
  sessionId: SessionId;
}

export type RevokeSessionOutput = Record<string, never>;

export class RevokeSessionUseCase extends UseCase<RevokeSessionInput, RevokeSessionOutput> {
  constructor(
    private readonly sessions: SessionRepositoryPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: RevokeSessionInput): Promise<Result<RevokeSessionOutput, DomainError>> {
    const session = await this.sessions.findById(input.sessionId);
    if (!session) return fail(new DomainError('Session not found'));

    session.revoke();
    this.uow.collect(session);
    await this.uow.run(async (tx) => {
      await this.sessions.delete(session.id, tx);
    });

    return ok({});
  }
}
