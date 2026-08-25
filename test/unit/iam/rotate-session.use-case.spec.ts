import { RotateSessionUseCase } from '@contexts/iam/application/commands/rotate-session.use-case';
import { RememberMeTokenService } from '@contexts/iam/application/services/remember-me-token.service';
import { Session } from '@contexts/iam/domain/session/session.entity';
import { SessionRotated, SessionRevoked } from '@contexts/iam/domain/events/session-events';
import { InMemorySessionRepository, FakeUnitOfWork, FakeTokenHasher } from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');
const EXPIRY = new Date('2026-01-31T00:00:00Z');

function makeRotate() {
  const sessions = new InMemorySessionRepository();
  const uow = new FakeUnitOfWork();
  const tokenHasher = new FakeTokenHasher();
  const rememberMe = new RememberMeTokenService(tokenHasher);
  const useCase = new RotateSessionUseCase(sessions, tokenHasher, rememberMe, uow);
  return { useCase, sessions, uow, tokenHasher, rememberMe };
}

function seed(sessions: InMemorySessionRepository, series: string, token: string, hasher: FakeTokenHasher, userId = 'u1') {
  const session = Session.create({
    userId: userId as never,
    seriesHash: hasher.hash(series),
    tokenHash: hasher.hash(token),
    expiresAt: EXPIRY,
    now: NOW,
  });
  return session;
}

describe('RotateSessionUseCase', () => {
  it('rotates the token for a valid series+token and returns a fresh cookie (same series)', async () => {
    const { useCase, sessions, uow, tokenHasher } = makeRotate();
    const session = seed(sessions, 'series1', 'token1', tokenHasher);
    await sessions.save(session);

    const result = await useCase.execute({ series: 'series1', token: 'token1', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe('u1');
    const parsed = RememberMeTokenService.parseCookie(result.value.rememberMeCookie);
    expect(parsed).not.toBeNull();
    expect(parsed!.series).toBe('series1'); // series stable
    expect(parsed!.token).not.toBe('token1'); // token rotated

    const stored = await sessions.findBySeriesHash(tokenHasher.hash('series1'));
    expect(stored?.tokenHash).toBe(tokenHasher.hash(parsed!.token));
    expect(uow.dispatched.some((e) => e instanceof SessionRotated)).toBe(true);
  });

  it('on a mismatched token for a known series (theft), invalidates ALL the user sessions and fails', async () => {
    const { useCase, sessions, uow, tokenHasher } = makeRotate();
    const presented = seed(sessions, 'series1', 'token1', tokenHasher, 'u1');
    const other = seed(sessions, 'series2', 'token2', tokenHasher, 'u1');
    await sessions.save(presented);
    await sessions.save(other);
    expect(await sessions.findByUserId('u1' as never)).toHaveLength(2);

    const result = await useCase.execute({ series: 'series1', token: 'wrong-token', now: NOW });
    expect(result.ok).toBe(false);
    expect(await sessions.findByUserId('u1' as never)).toHaveLength(0); // all invalidated
    expect(uow.dispatched.some((e) => e instanceof SessionRevoked)).toBe(true);
  });

  it('fails on an unknown series', async () => {
    const { useCase } = makeRotate();
    const result = await useCase.execute({ series: 'unknown', token: 't', now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails on an expired session', async () => {
    const { useCase, sessions, tokenHasher } = makeRotate();
    const expired = Session.create({
      userId: 'u1' as never,
      seriesHash: tokenHasher.hash('series1'),
      tokenHash: tokenHasher.hash('token1'),
      expiresAt: NOW, // already expired at NOW
      now: new Date('2025-12-01T00:00:00Z'),
    });
    await sessions.save(expired);
    const result = await useCase.execute({ series: 'series1', token: 'token1', now: NOW });
    expect(result.ok).toBe(false);
  });
});
