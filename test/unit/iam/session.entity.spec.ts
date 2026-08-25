import { Session } from '@contexts/iam/domain/session/session.entity';
import { SessionRotated, SessionRevoked } from '@contexts/iam/domain/events/session-events';

const NOW = new Date('2026-01-01T00:00:00Z');
const LATER = new Date('2026-01-15T00:00:00Z');
const EXPIRY = new Date('2026-01-31T00:00:00Z');

describe('Session entity', () => {
  it('create yields a non-expired session with rotatedAt = now', () => {
    const s = Session.create({
      userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th', expiresAt: EXPIRY, now: NOW,
    });
    expect(s.userId).toBe('u1');
    expect(s.seriesHash).toBe('sh');
    expect(s.tokenHash).toBe('th');
    expect(s.rotatedAt).toBe(NOW);
    expect(s.isExpired(NOW)).toBe(false);
  });

  it('isExpired is true once now >= expiresAt', () => {
    const s = Session.create({
      userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th', expiresAt: NOW, now: NOW,
    });
    expect(s.isExpired(NOW)).toBe(true);
  });

  it('isForSeries and matchesToken compare by hash', () => {
    const s = Session.create({
      userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th', expiresAt: EXPIRY, now: NOW,
    });
    expect(s.isForSeries('sh')).toBe(true);
    expect(s.isForSeries('other')).toBe(false);
    expect(s.matchesToken('th')).toBe(true);
    expect(s.matchesToken('other')).toBe(false);
  });

  it('rotate sets a new tokenHash + rotatedAt and emits SessionRotated', () => {
    const s = Session.create({
      userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th', expiresAt: EXPIRY, now: NOW,
    });
    s.rotate('th2', LATER);
    expect(s.tokenHash).toBe('th2');
    expect(s.rotatedAt).toBe(LATER);
    expect(s.domainEvents.some((e) => e instanceof SessionRotated)).toBe(true);
  });

  it('revoke emits SessionRevoked', () => {
    const s = Session.create({
      userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th', expiresAt: EXPIRY, now: NOW,
    });
    s.revoke();
    expect(s.domainEvents.some((e) => e instanceof SessionRevoked)).toBe(true);
  });

  it('fromPersistence reconstitutes without events', () => {
    const s = Session.fromPersistence({
      id: 's1' as never, userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th',
      expiresAt: EXPIRY, rotatedAt: NOW,
    });
    expect(s.id).toBe('s1');
    expect(s.domainEvents).toHaveLength(0);
  });
});
