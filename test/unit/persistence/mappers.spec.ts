import { UserMapper } from '@infra/persistence/mappers/user.mapper';
import { SessionMapper } from '@infra/persistence/mappers/session.mapper';
import { TokenMapper } from '@infra/persistence/mappers/token.mapper';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { Session } from '@contexts/iam/domain/session/session.entity';
import { Token } from '@contexts/iam/domain/token/token.entity';
import { Email } from '@contexts/iam/domain/user/email.vo';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { Identifier } from '@kernel/domain';
import type { Prisma } from '@infra/persistence/prisma/client';

const NOW = new Date('2026-01-01T00:00:00Z');

function okEmail(v: string): Email {
  const r = Email.create(v);
  if (!r.ok) throw new Error('bad email');
  return r.value;
}

describe('UserMapper', () => {
  it('round-trips a User through persistence', () => {
    const user = User.register({
      email: okEmail('a@b.com'),
      password: HashedPassword.fromHash('hashed:pw'),
      role: 'READER',
    });
    const row = UserMapper.toPersistence(user);
    expect(row.email).toBe('a@b.com');
    expect(row.passwordHash).toBe('hashed:pw');
    expect(row.role).toBe('READER');
    expect(row.emailVerified).toBe(false);
    expect(row.status).toBe('ACTIVE');

    const back = UserMapper.toDomain({ ...row, createdAt: NOW, updatedAt: NOW } as Prisma.UserGetPayload<{}>);
    expect(back.id).toBe(user.id);
    expect(back.email.value).toBe('a@b.com');
    expect(back.role).toBe('READER');
    expect(back.emailVerified).toBe(false);
    expect(back.status).toBe('ACTIVE');
  });

  it('toDomain throws on a corrupt email row', () => {
    expect(() =>
      UserMapper.toDomain({
        id: 'u1', email: 'not-an-email', passwordHash: 'x', role: 'READER',
        emailVerified: true, status: 'ACTIVE', createdAt: NOW, updatedAt: NOW,
      }),
    ).toThrow();
  });
});

describe('SessionMapper', () => {
  it('round-trips a Session', () => {
    const session = Session.create({
      userId: Identifier.from<'User'>('u1'),
      seriesHash: 'sh', tokenHash: 'th',
      expiresAt: new Date(NOW.getTime() + 1000), now: NOW,
    });
    const row = SessionMapper.toPersistence(session);
    expect(row.seriesHash).toBe('sh');
    const back = SessionMapper.toDomain({ ...row, createdAt: NOW } as Prisma.SessionGetPayload<{}>);
    expect(back.userId).toBe('u1');
    expect(back.seriesHash).toBe('sh');
    expect(back.tokenHash).toBe('th');
  });
});

describe('TokenMapper', () => {
  it('round-trips a Token', () => {
    const token = Token.create({
      type: 'VERIFICATION', selector: 'sel', verifierHash: 'vh',
      userId: Identifier.from<'User'>('u1'), expiresAt: new Date(NOW.getTime() + 1000),
    });
    const row = TokenMapper.toPersistence(token);
    expect(row.type).toBe('VERIFICATION');
    expect(row.selector).toBe('sel');
    expect(row.usedAt).toBeNull();
    const back = TokenMapper.toDomain({ ...row } as Prisma.TokenGetPayload<{}>);
    expect(back.type).toBe('VERIFICATION');
    expect(back.selector).toBe('sel');
    expect(back.isUsed()).toBe(false);
  });
});
