import { ForgotPasswordUseCase } from '@contexts/iam/application/commands/forgot-password.use-case';
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

function makeForgot() {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryTokenRepository();
  const queue = new FakeQueueProducer();
  const uow = new FakeUnitOfWork();
  const tokenService = new TokenService(new FakeTokenHasher());
  const useCase = new ForgotPasswordUseCase(users, tokens, tokenService, queue, uow);
  return { useCase, users, tokens, queue, uow, tokenService };
}

async function seedUser(users: InMemoryUserRepository) {
  const user = User.register({
    email: email('a@b.com'),
    password: HashedPassword.fromHash('h'),
    role: 'READER',
  });
  user.verifyEmail();
  await users.save(user);
  return user;
}

describe('ForgotPasswordUseCase', () => {
  it('issues a 1h reset token and enqueues a reset email for a known user', async () => {
    const { useCase, users, tokens, queue, tokenService } = makeForgot();
    const user = await seedUser(users);

    const result = await useCase.execute({ email: 'a@b.com', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enqueued).toBe(true);

    expect(queue.resetEmails).toHaveLength(1);
    expect(queue.resetEmails[0].userId).toBe(user.id);
    const token = await tokens.findBySelector(queue.resetEmails[0].tokenSelector);
    expect(token?.type).toBe('RESET');
    expect(token?.userId).toBe(user.id);
    expect(token!.expiresAt.getTime() - NOW.getTime()).toBe(60 * 60 * 1000); // 1h
    void tokenService;
  });

  it('returns enqueued:false (no leak) for an unknown email', async () => {
    const { useCase, queue } = makeForgot();
    const result = await useCase.execute({ email: 'nobody@example.com', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enqueued).toBe(false);
    expect(queue.resetEmails).toHaveLength(0);
  });

  it('returns enqueued:false for an invalid email', async () => {
    const { useCase, queue } = makeForgot();
    const result = await useCase.execute({ email: 'not-an-email', now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enqueued).toBe(false);
    expect(queue.resetEmails).toHaveLength(0);
  });
});
