import { PrismaUserRepository } from '@infra/persistence/repositories/user.repository';
import { PrismaSessionRepository } from '@infra/persistence/repositories/session.repository';
import { PrismaTokenRepository } from '@infra/persistence/repositories/token.repository';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { Email } from '@contexts/iam/domain/user/email.vo';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { Identifier } from '@kernel/domain';
import type { UserId } from '@contexts/iam/domain/user/user.types';

function okEmail(v: string): Email { const r = Email.create(v); if (!r.ok) throw new Error('x'); return r.value; }

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

function stubClient(): PrismaService {
  const store = {
    user: {} as Record<string, Row>,
    session: {} as Record<string, Row>,
    token: {} as Record<string, Row>,
  };
  const client = {
    user: {
      findUnique: jest.fn(async (arg: { where: Where }) => {
        const w = arg.where;
        if (w.email) return Object.values(store.user).find((u) => u.email === w.email) ?? null;
        return (w.id ? store.user[String(w.id)] : null) ?? null;
      }),
      create: jest.fn(async (arg: { data: Row }) => {
        store.user[String(arg.data.id)] = arg.data;
        return arg.data;
      }),
      update: jest.fn(async (arg: { where: Where; data: Row }) => {
        const id = String(arg.where.id);
        store.user[id] = { ...store.user[id], ...arg.data };
        return store.user[id];
      }),
    },
    session: {
      findUnique: jest.fn(async (arg: { where: Where }) => {
        const w = arg.where;
        if (w.id) return store.session[String(w.id)] ?? null;
        if (w.seriesHash) return Object.values(store.session).find((s) => s.seriesHash === w.seriesHash) ?? null;
        return null;
      }),
      findMany: jest.fn(async (arg: { where: Where }) =>
        Object.values(store.session).filter((s) => s.userId === arg.where.userId),
      ),
      create: jest.fn(async (arg: { data: Row }) => {
        store.session[String(arg.data.id)] = arg.data;
        return arg.data;
      }),
      update: jest.fn(async (arg: { where: Where; data: Row }) => {
        const id = String(arg.where.id);
        store.session[id] = { ...store.session[id], ...arg.data };
        return store.session[id];
      }),
      delete: jest.fn(async (arg: { where: Where }) => { delete store.session[String(arg.where.id)]; }),
      deleteMany: jest.fn(async (arg: { where: Where }) => {
        const uid = arg.where.userId;
        for (const s of Object.values(store.session).filter((x) => x.userId === uid)) {
          delete store.session[String(s.id)];
        }
      }),
    },
    token: {
      findUnique: jest.fn(async (arg: { where: Where }) => store.token[String(arg.where.selector)] ?? null),
      create: jest.fn(async (arg: { data: Row }) => {
        store.token[String(arg.data.selector)] = arg.data;
        return arg.data;
      }),
      update: jest.fn(async (arg: { where: Where; data: Row }) => {
        const sel = String(arg.where.selector);
        store.token[sel] = { ...store.token[sel], ...arg.data };
        return store.token[sel];
      }),
    },
  };
  return client as unknown as PrismaService;
}

describe('PrismaUserRepository', () => {
  it('saves and finds a user by email, using the tx client when provided', async () => {
    const client = stubClient();
    const repo = new PrismaUserRepository(client);
    const user = User.register({ email: okEmail('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER' });
    await repo.save(user);
    expect(client.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: user.id }) });

    const txClient = stubClient();
    const found = await repo.findByEmail(okEmail('a@b.com'), txClient);
    expect(found).toBeNull(); // txClient store is empty, proving the tx was used not the base client
  });

  it('updates a user and reads it back by id', async () => {
    const client = stubClient();
    const repo = new PrismaUserRepository(client);
    const user = User.register({ email: okEmail('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER' });
    await repo.save(user);
    user.verifyEmail();
    await repo.update(user);
    const found = await repo.findById(user.id);
    expect(found?.emailVerified).toBe(true);
  });
});

describe('PrismaSessionRepository', () => {
  it('saves, finds by seriesHash, deletes by userId', async () => {
    const client = stubClient();
    const repo = new PrismaSessionRepository(client);
    const session = (await import('@contexts/iam/domain/session/session.entity')).Session.create({
      userId: Identifier.from<'User'>('u1'), seriesHash: 'sh', tokenHash: 'th',
      expiresAt: new Date(Date.now() + 1000), now: new Date(),
    });
    await repo.save(session);
    expect((await repo.findBySeriesHash('sh'))?.id).toBe(session.id);
    await repo.deleteByUserId('u1' as UserId);
    expect(await repo.findBySeriesHash('sh')).toBeNull();
  });
});

describe('PrismaTokenRepository', () => {
  it('saves and finds by selector', async () => {
    const client = stubClient();
    const repo = new PrismaTokenRepository(client);
    const token = (await import('@contexts/iam/domain/token/token.entity')).Token.create({
      type: 'VERIFICATION', selector: 'sel', verifierHash: 'vh',
      userId: Identifier.from<'User'>('u1'), expiresAt: new Date(Date.now() + 1000),
    });
    await repo.save(token);
    expect((await repo.findBySelector('sel'))?.id).toBe(token.id);
  });
});
