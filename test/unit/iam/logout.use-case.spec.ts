import { LogoutUseCase } from '@contexts/iam/application/commands/logout.use-case';
import { Session } from '@contexts/iam/domain/session/session.entity';
import { SessionRevoked } from '@contexts/iam/domain/events/session-events';
import { InMemorySessionRepository, FakeUnitOfWork, FakeTokenHasher } from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');
const EXPIRY = new Date('2026-01-31T00:00:00Z');

function seedSession(sessions: InMemorySessionRepository, series = 'series1', token = 'token1') {
  const hasher = new FakeTokenHasher();
  const session = Session.create({
    userId: 'u1' as never,
    seriesHash: hasher.hash(series),
    tokenHash: hasher.hash(token),
    expiresAt: EXPIRY,
    now: NOW,
  });
  return session;
}

describe('LogoutUseCase', () => {
  it('destroys the remember-me session for the presented series and dispatches SessionRevoked', async () => {
    const sessions = new InMemorySessionRepository();
    const uow = new FakeUnitOfWork();
    const session = seedSession(sessions, 'series1', 'token1');
    await sessions.save(session);
    const useCase = new LogoutUseCase(sessions, new FakeTokenHasher(), uow);

    const result = await useCase.execute({ series: 'series1' });
    expect(result.ok).toBe(true);
    expect(await sessions.findBySeriesHash(new FakeTokenHasher().hash('series1'))).toBeNull();
    expect(uow.dispatched.some((e) => e instanceof SessionRevoked)).toBe(true);
  });

  it('succeeds (no-op) when no session matches the series', async () => {
    const sessions = new InMemorySessionRepository();
    const uow = new FakeUnitOfWork();
    const useCase = new LogoutUseCase(sessions, new FakeTokenHasher(), uow);

    const result = await useCase.execute({ series: 'unknown' });
    expect(result.ok).toBe(true);
    expect(uow.dispatched).toHaveLength(0);
  });
});
