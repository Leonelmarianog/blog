import { ResendVerificationUseCase } from '@contexts/iam/application/commands/resend-verification.use-case';
import { TokenService } from '@contexts/iam/application/services/token.service';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import {
  email,
  InMemoryUserRepository,
  InMemoryTokenRepository,
  FakeQueueProducer,
  FakeUnitOfWork,
  FakeTokenHasher,
} from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');

function makeResend() {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryTokenRepository();
  const queue = new FakeQueueProducer();
  const uow = new FakeUnitOfWork();
  const tokenService = new TokenService(new FakeTokenHasher());
  const useCase = new ResendVerificationUseCase(users, tokens, tokenService, queue, uow);
  return { useCase, users, tokens, queue, uow, tokenService };
}

async function seedUnverified(users: InMemoryUserRepository) {
  const user = User.register({
    email: email('a@b.com'),
    password: HashedPassword.fromHash('h'),
    role: 'READER',
  });
  await users.save(user);
  return user;
}

describe('ResendVerificationUseCase', () => {
  it('enqueues a fresh verification email for an unverified user', async () => {
    const { useCase, users, queue } = makeResend();
    const user = await seedUnverified(users);

    const result = await useCase.execute({ email: 'a@b.com', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enqueued).toBe(true);
    expect(queue.verificationEmails).toHaveLength(1);
    expect(queue.verificationEmails[0].userId).toBe(user.id);
  });

  it('returns enqueued:false (no leak) for an unknown email', async () => {
    const { useCase, queue } = makeResend();
    const result = await useCase.execute({ email: 'nobody@example.com', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enqueued).toBe(false);
    expect(queue.verificationEmails).toHaveLength(0);
  });

  it('returns enqueued:false for an already-verified user', async () => {
    const { useCase, users, queue } = makeResend();
    const user = await seedUnverified(users);
    user.verifyEmail();
    await users.update(user);

    const result = await useCase.execute({ email: 'a@b.com', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enqueued).toBe(false);
    expect(queue.verificationEmails).toHaveLength(0);
  });

  it('returns enqueued:false for an invalid email', async () => {
    const { useCase, queue } = makeResend();
    const result = await useCase.execute({ email: 'not-an-email', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enqueued).toBe(false);
    expect(queue.verificationEmails).toHaveLength(0);
  });
});
