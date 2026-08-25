import { randomBytes } from 'node:crypto';
import { TokenHasherPort } from '../ports/token-hasher.port';
import { Session } from '../../domain/session/session.entity';
import type { UserId } from '../../domain/user/user.types';

const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (spec §7)

export interface RememberMeCredential {
  series: string;
  token: string;
}

export class RememberMeTokenService {
  constructor(private readonly hasher: TokenHasherPort) {}

  static parseCookie(value: string): RememberMeCredential | null {
    const idx = value.indexOf('.');
    if (idx <= 0 || idx === value.length - 1) return null;
    const series = value.slice(0, idx);
    const token = value.slice(idx + 1);
    return { series, token };
  }

  static formatCookie(series: string, token: string): string {
    return `${series}.${token}`;
  }

  createSeries(): { series: string; seriesHash: string } {
    const series = randomBytes(24).toString('base64url');
    return { series, seriesHash: this.hasher.hash(series) };
  }

  createToken(): { token: string; tokenHash: string } {
    const token = randomBytes(24).toString('base64url');
    return { token, tokenHash: this.hasher.hash(token) };
  }

  rotate(session: Session, now: Date): { token: string; tokenHash: string } {
    const { token, tokenHash } = this.createToken();
    session.rotate(tokenHash, now);
    return { token, tokenHash };
  }

  createSession(userId: UserId, now: Date): { session: Session; series: string; token: string } {
    const { series, seriesHash } = this.createSeries();
    const { token, tokenHash } = this.createToken();
    const expiresAt = new Date(now.getTime() + REMEMBER_ME_TTL_MS);
    const session = Session.create({ userId, seriesHash, tokenHash, expiresAt, now });
    return { session, series, token };
  }
}
