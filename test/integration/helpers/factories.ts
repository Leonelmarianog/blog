import type { INestApplication } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { PASSWORD_HASHER } from '@contexts/iam/application/ports/password-hasher.port';
import { TOKEN_HASHER } from '@contexts/iam/application/ports/token-hasher.port';
import type { PasswordHasherPort } from '@contexts/iam/application/ports/password-hasher.port';
import type { TokenHasherPort } from '@contexts/iam/application/ports/token-hasher.port';
import type { Role } from '@contexts/iam/domain/authorization/role';
import type { UserStatus } from '@contexts/iam/domain/user/user-status';
import type { TokenType } from '@contexts/iam/domain/token/token.types';

export interface SeededUser {
  id: string;
  email: string;
  password: string;
}
export interface SeededToken {
  selector: string;
  verifier: string;
}
export interface SeededSession {
  id: string;
  series: string;
  token: string;
}

export interface Seed {
  user(opts?: {
    email?: string;
    password?: string;
    role?: Role;
    status?: UserStatus;
    emailVerified?: boolean;
    displayName?: string;
  }): Promise<SeededUser>;
  token(opts: {
    userId: string;
    type: TokenType;
    verifier?: string;
    expiresAt?: Date;
    usedAt?: Date | null;
  }): Promise<SeededToken>;
  session(opts: {
    userId: string;
    series?: string;
    token?: string;
    expiresAt?: Date;
  }): Promise<SeededSession>;
}

const VERIFICATION_TTL = 24 * 60 * 60 * 1000;
const RESET_TTL = 60 * 60 * 1000;
const REMEMBER_TTL = 30 * 24 * 60 * 60 * 1000;

export function makeSeed(app: INestApplication): Seed {
  const prisma = app.get(PrismaService);
  const passwordHasher = app.get<PasswordHasherPort>(PASSWORD_HASHER);
  const tokenHasher = app.get<TokenHasherPort>(TOKEN_HASHER);

  return {
    async user(opts = {}): Promise<SeededUser> {
      const id = randomUUID();
      const email = opts.email ?? `user-${id}@example.com`;
      const password = opts.password ?? 'Password123!';
      const passwordHash = await passwordHasher.hash(password);
      await prisma.user.create({
        data: {
          id,
          email,
          passwordHash,
          role: opts.role ?? 'READER',
          displayName: opts.displayName ?? 'Test User',
          emailVerified: opts.emailVerified ?? true,
          status: opts.status ?? 'ACTIVE',
        },
      });
      return { id, email, password };
    },

    async token(opts): Promise<SeededToken> {
      const id = randomUUID();
      const selector = randomBytes(16).toString('base64url');
      const verifier = opts.verifier ?? randomBytes(24).toString('base64url');
      const expiresAt =
        opts.expiresAt ?? new Date(Date.now() + (opts.type === 'VERIFICATION' ? VERIFICATION_TTL : RESET_TTL));
      await prisma.token.create({
        data: {
          id,
          type: opts.type,
          selector,
          verifierHash: tokenHasher.hash(verifier),
          userId: opts.userId,
          expiresAt,
          usedAt: opts.usedAt ?? null,
        },
      });
      return { selector, verifier };
    },

    async session(opts): Promise<SeededSession> {
      const id = randomUUID();
      const series = opts.series ?? randomBytes(24).toString('base64url');
      const token = opts.token ?? randomBytes(24).toString('base64url');
      await prisma.session.create({
        data: {
          id,
          userId: opts.userId,
          seriesHash: tokenHasher.hash(series),
          tokenHash: tokenHasher.hash(token),
          expiresAt: opts.expiresAt ?? new Date(Date.now() + REMEMBER_TTL),
          rotatedAt: new Date(),
        },
      });
      return { id, series, token };
    },
  };
}
