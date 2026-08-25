import { RegisterUseCase } from '@contexts/iam/application/commands/register.use-case';
import { PasswordHasherService } from '@contexts/iam/application/services/password-hasher.service';
import { TokenService } from '@contexts/iam/application/services/token.service';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { UserRegistered } from '@contexts/iam/domain/events/user-events';
import {
  email,
  InMemoryUserRepository,
  InMemoryTokenRepository,
  FakeQueueProducer,
  FakeUnitOfWork,
  FakePasswordHasher,
  FakeTokenHasher,
} from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');

function makeRegister() {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryTokenRepository();
  const queue = new FakeQueueProducer();
  const uow = new FakeUnitOfWork();
  const passwordHasher = new PasswordHasherService(new FakePasswordHasher());
  const tokenService = new TokenService(new FakeTokenHasher());
  const useCase = new RegisterUseCase(users, tokens, tokenService, passwordHasher, queue, uow);
  return { useCase, users, tokens, queue, uow };
}

describe('RegisterUseCase', () => {
  it('registers a new READER user, persists user+token, enqueues a verification email, dispatches UserRegistered', async () => {
    const { useCase, users, tokens, queue, uow } = makeRegister();
    const result = await useCase.execute({ email: '  A@B.com  ', password: 'pw', now: NOW });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const userId = result.value.userId;

    const user = await users.findById(userId);
    expect(user).not.toBeNull();
    expect(user?.role).toBe('READER');
    expect(user?.email.value).toBe('a@b.com'); // normalized
    expect(user?.emailVerified).toBe(false);
    expect(user?.password.hash).toBe('hashed:pw'); // hashed via FakePasswordHasher

    expect(queue.verificationEmails).toHaveLength(1);
    const payload = queue.verificationEmails[0];
    expect(payload.to).toBe('a@b.com');
    expect(payload.userId).toBe(userId);

    const token = await tokens.findBySelector(payload.tokenSelector);
    expect(token).not.toBeNull();
    expect(token?.type).toBe('VERIFICATION');
    expect(token?.userId).toBe(userId);
    expect(token?.isUsed()).toBe(false);
    expect(token?.verifierHash).toBe(`sha:${payload.tokenVerifier}`); // FakeTokenHasher
    expect(token!.expiresAt.getTime() - NOW.getTime()).toBe(24 * 60 * 60 * 1000);

    expect(uow.dispatched.some((e) => e instanceof UserRegistered)).toBe(true);
  });

  it('fails on an invalid email', async () => {
    const { useCase } = makeRegister();
    const result = await useCase.execute({ email: 'not-an-email', password: 'pw', now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails when the email is already registered', async () => {
    const { useCase, users } = makeRegister();
    const existing = User.register({
      email: email('a@b.com'),
      password: HashedPassword.fromHash('h'),
      role: 'READER',
    });
    await users.save(existing);

    const result = await useCase.execute({ email: 'a@b.com', password: 'pw', now: NOW });
    expect(result.ok).toBe(false);
  });
});
