import { RevokeSessionUseCase } from '@contexts/iam/application/commands/revoke-session.use-case';
import { Session } from '@contexts/iam/domain/session/session.entity';
import { SessionRevoked } from '@contexts/iam/domain/events/session-events';
import { InMemorySessionRepository, FakeUnitOfWork } from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');
const EXPIRY = new Date('2026-01-31T00:00:00Z');

describe('RevokeSessionUseCase', () => {
  it('revokes and deletes a session by id, dispatching SessionRevoked', async () => {
    const sessions = new InMemorySessionRepository();
    const uow = new FakeUnitOfWork();
    const session = Session.create({
      userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th', expiresAt: EXPIRY, now: NOW,
    });
    await sessions.save(session);
    const useCase = new RevokeSessionUseCase(sessions, uow);

    const result = await useCase.execute({ sessionId: session.id });
    expect(result.ok).toBe(true);
    expect(await sessions.findById(session.id)).toBeNull();
    expect(uow.dispatched.some((e) => e instanceof SessionRevoked)).toBe(true);
  });

  it('fails when the session id is unknown', async () => {
    const sessions = new InMemorySessionRepository();
    const uow = new FakeUnitOfWork();
    const useCase = new RevokeSessionUseCase(sessions, uow);
    const result = await useCase.execute({ sessionId: 'nope' as never });
    expect(result.ok).toBe(false);
  });
});
