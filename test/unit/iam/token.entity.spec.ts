import { Token } from '@contexts/iam/domain/token/token.entity';

const NOW = new Date('2026-01-01T00:00:00Z');
const FUTURE = new Date('2026-01-02T00:00:00Z');
const PAST = new Date('2025-12-30T00:00:00Z');

describe('Token entity', () => {
  it('create yields an unused, non-expired token', () => {
    const token = Token.create({
      type: 'VERIFICATION',
      selector: 'sel',
      verifierHash: 'hash',
      userId: 'u1' as never,
      expiresAt: FUTURE,
    });
    expect(token.type).toBe('VERIFICATION');
    expect(token.selector).toBe('sel');
    expect(token.verifierHash).toBe('hash');
    expect(token.userId).toBe('u1');
    expect(token.isUsed()).toBe(false);
    expect(token.isExpired(NOW)).toBe(false);
  });

  it('isExpired is true once now >= expiresAt', () => {
    const token = Token.create({
      type: 'RESET', selector: 's', verifierHash: 'h', userId: 'u1' as never, expiresAt: NOW,
    });
    expect(token.isExpired(NOW)).toBe(true);
    expect(token.isExpired(PAST)).toBe(false);
  });

  it('consume marks the token used', () => {
    const token = Token.create({
      type: 'VERIFICATION', selector: 's', verifierHash: 'h', userId: 'u1' as never, expiresAt: FUTURE,
    });
    expect(token.isUsed()).toBe(false);
    token.consume(NOW);
    expect(token.isUsed()).toBe(true);
    expect(token.usedAt).toBe(NOW);
  });

  it('fromPersistence reconstitutes with usedAt intact', () => {
    const token = Token.fromPersistence({
      id: 't1' as never, type: 'RESET', selector: 's', verifierHash: 'h',
      userId: 'u1' as never, expiresAt: FUTURE, usedAt: NOW,
    });
    expect(token.isUsed()).toBe(true);
    expect(token.id).toBe('t1');
  });
});
