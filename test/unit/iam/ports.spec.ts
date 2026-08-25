import { Email } from '@contexts/iam/domain/user/email.vo';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import {
  InMemoryUserRepository,
  InMemorySessionRepository,
  InMemoryTokenRepository,
  FakePasswordHasher,
  FakeTokenHasher,
  FakeQueueProducer,
  FakeUnitOfWork,
} from './fakes';
import type {
  UserRepositoryPort,
  SessionRepositoryPort,
  TokenRepositoryPort,
  PasswordHasherPort,
  TokenHasherPort,
  QueueProducerPort,
} from '@contexts/iam/application/ports';

function email(v: string): Email {
  const r = Email.create(v);
  if (!r.ok) throw new Error('fixture');
  return r.value;
}

describe('IAM ports + fakes', () => {
  it('fakes satisfy the port interfaces (compile + behavior)', async () => {
    const users: UserRepositoryPort = new InMemoryUserRepository();
    const _sessions: SessionRepositoryPort = new InMemorySessionRepository();
    const _tokens: TokenRepositoryPort = new InMemoryTokenRepository();
    const hasher: PasswordHasherPort = new FakePasswordHasher();
    const tokenHasher: TokenHasherPort = new FakeTokenHasher();
    const queue: QueueProducerPort = new FakeQueueProducer();

    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER' });
    await users.save(user);
    expect((await users.findByEmail(email('a@b.com')))?.id).toBe(user.id);
    expect((await users.findById(user.id))?.email.value).toBe('a@b.com');

    expect(await hasher.verify('pw', await hasher.hash('pw'))).toBe(true);
    expect(tokenHasher.verify('v', tokenHasher.hash('v'))).toBe(true);

    await queue.enqueueVerificationEmail({ userId: user.id, to: 'a@b.com', tokenSelector: 's', tokenVerifier: 'v' });
    expect((queue as FakeQueueProducer).verificationEmails).toHaveLength(1);
  });

  it('FakeUnitOfWork dispatches collected events on run and clears them', async () => {
    const uow = new FakeUnitOfWork();
    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER' });
    uow.collect(user);
    const result = await uow.run(async () => 'ok');
    expect(result).toBe('ok');
    expect(uow.dispatched.length).toBeGreaterThanOrEqual(1);
    expect(user.domainEvents).toHaveLength(0);
  });
});
