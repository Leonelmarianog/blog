import { randomBytes } from 'node:crypto';
import { TokenHasherPort } from '../ports/token-hasher.port';
import { Token } from '../../domain/token/token.entity';
import type { TokenType } from '../../domain/token/token.types';
import type { UserId } from '../../domain/user/user.types';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h (spec §6)
const RESET_TTL_MS = 60 * 60 * 1000;            // 1h  (spec §6)

export interface IssuedToken {
  token: Token;
  selector: string;
  verifier: string;
}

export class TokenService {
  constructor(private readonly hasher: TokenHasherPort) {}

  issue(type: TokenType, userId: UserId, now: Date): IssuedToken {
    const selector = randomBytes(16).toString('base64url');
    const verifier = randomBytes(24).toString('base64url');
    const verifierHash = this.hasher.hash(verifier);
    const ttl = type === 'VERIFICATION' ? VERIFICATION_TTL_MS : RESET_TTL_MS;
    const expiresAt = new Date(now.getTime() + ttl);
    const token = Token.create({ type, selector, verifierHash, userId, expiresAt });
    return { token, selector, verifier };
  }
}
