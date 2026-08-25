import { PasswordHasherService } from '@contexts/iam/application/services/password-hasher.service';
import { RememberMeTokenService } from '@contexts/iam/application/services/remember-me-token.service';
import { TokenService } from '@contexts/iam/application/services/token.service';
import { FakePasswordHasher, FakeTokenHasher } from './fakes';
import { Session } from '@contexts/iam/domain/session/session.entity';

const NOW = new Date('2026-01-01T00:00:00Z');

describe('PasswordHasherService', () => {
  const svc = new PasswordHasherService(new FakePasswordHasher());

  it('hashPassword returns a HashedPassword wrapping the port hash', async () => {
    const hp = await svc.hashPassword('pw');
    expect(hp.hash).toBe('hashed:pw');
  });

  it('verifyPassword delegates to the port', async () => {
    const hp = await svc.hashPassword('pw');
    expect(await svc.verifyPassword('pw', hp)).toBe(true);
    expect(await svc.verifyPassword('other', hp)).toBe(false);
  });
});

describe('RememberMeTokenService', () => {
  const svc = new RememberMeTokenService(new FakeTokenHasher());

  it('createSeries returns a plaintext series and its hash', () => {
    const { series, seriesHash } = svc.createSeries();
    expect(series.length).toBeGreaterThan(0);
    expect(seriesHash).toBe(`sha:${series}`);
  });

  it('createToken returns a plaintext token and its hash', () => {
    const { token, tokenHash } = svc.createToken();
    expect(token.length).toBeGreaterThan(0);
    expect(tokenHash).toBe(`sha:${token}`);
  });

  it('rotate rotates the session and returns a fresh token', () => {
    const session = Session.create({
      userId: 'u1' as never, seriesHash: 'sh', tokenHash: 'th',
      expiresAt: new Date('2026-02-01T00:00:00Z'), now: NOW,
    });
    const { token, tokenHash } = svc.rotate(session, NOW);
    expect(tokenHash).toBe(`sha:${token}`);
    expect(session.tokenHash).toBe(tokenHash);
    expect(session.rotatedAt).toBe(NOW);
  });

  it('createSession builds a 30-day session with matching series/token hashes', () => {
    const { session, series, token } = svc.createSession('u1' as never, NOW);
    expect(session.userId).toBe('u1');
    expect(session.seriesHash).toBe(`sha:${series}`);
    expect(session.tokenHash).toBe(`sha:${token}`);
    expect(session.expiresAt.getTime() - NOW.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('parseCookie / formatCookie round-trip and reject malformed input', () => {
    const cookie = RememberMeTokenService.formatCookie('series1', 'token1');
    expect(cookie).toBe('series1.token1');
    expect(RememberMeTokenService.parseCookie(cookie)).toEqual({ series: 'series1', token: 'token1' });
    expect(RememberMeTokenService.parseCookie('no-separator')).toBeNull();
    expect(RememberMeTokenService.parseCookie('')).toBeNull();
  });
});

describe('TokenService', () => {
  const svc = new TokenService(new FakeTokenHasher());

  it('issues a verification token with a 24h expiry', () => {
    const { token, selector, verifier } = svc.issue('VERIFICATION', 'u1' as never, NOW);
    expect(token.type).toBe('VERIFICATION');
    expect(token.userId).toBe('u1');
    expect(token.selector).toBe(selector);
    expect(token.verifierHash).toBe(`sha:${verifier}`);
    expect(token.isUsed()).toBe(false);
    expect(token.expiresAt.getTime() - NOW.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('issues a reset token with a 1h expiry', () => {
    const { token } = svc.issue('RESET', 'u1' as never, NOW);
    expect(token.type).toBe('RESET');
    expect(token.expiresAt.getTime() - NOW.getTime()).toBe(60 * 60 * 1000);
  });
});
