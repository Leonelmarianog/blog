import { LoginUseCase } from '@contexts/iam/application/commands/login.use-case';
import { PasswordHasherService } from '@contexts/iam/application/services/password-hasher.service';
import { RememberMeTokenService } from '@contexts/iam/application/services/remember-me-token.service';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import {
  email,
  InMemoryUserRepository,
  InMemorySessionRepository,
  FakeUnitOfWork,
  FakePasswordHasher,
  FakeTokenHasher,
} from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');

function makeLogin() {
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository();
  const uow = new FakeUnitOfWork();
  const passwordHasher = new PasswordHasherService(new FakePasswordHasher());
  const rememberMe = new RememberMeTokenService(new FakeTokenHasher());
  const useCase = new LoginUseCase(users, passwordHasher, rememberMe, sessions, uow);
  return { useCase, users, sessions, uow, rememberMe };
}

async function seedVerifiedUser(users: InMemoryUserRepository, emailStr = 'a@b.com', pw = 'pw') {
  const user = User.register({
    email: email(emailStr),
    password: HashedPassword.fromHash(`hashed:${pw}`),
    role: 'READER',
  });
  user.verifyEmail();
  await users.save(user);
  return user;
}

describe('LoginUseCase', () => {
  it('logs in a verified active user without remember-me (no cookie, no session)', async () => {
    const { useCase, users, sessions } = makeLogin();
    const user = await seedVerifiedUser(users);

    const result = await useCase.execute({ email: 'a@b.com', password: 'pw', rememberMe: false, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe(user.id);
    expect(result.value.rememberMeCookie).toBeNull();
    expect(await sessions.findByUserId(user.id)).toHaveLength(0);
  });

  it('logs in with remember-me: creates a 30-day session and returns a series.token cookie', async () => {
    const { useCase, users, sessions } = makeLogin();
    const user = await seedVerifiedUser(users);

    const result = await useCase.execute({ email: 'a@b.com', password: 'pw', rememberMe: true, now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe(user.id);
    const cookie = result.value.rememberMeCookie;
    expect(cookie).not.toBeNull();
    const parsed = RememberMeTokenService.parseCookie(cookie!);
    expect(parsed).not.toBeNull();

    const stored = await sessions.findByUserId(user.id);
    expect(stored).toHaveLength(1);
    expect(stored[0].seriesHash).toBe(`sha:${parsed!.series}`); // FakeTokenHasher
    expect(stored[0].tokenHash).toBe(`sha:${parsed!.token}`);
    expect(stored[0].expiresAt.getTime() - NOW.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('fails with a generic error on a wrong password', async () => {
    const { useCase, users } = makeLogin();
    await seedVerifiedUser(users, 'a@b.com', 'pw');
    const result = await useCase.execute({ email: 'a@b.com', password: 'wrong', rememberMe: false, now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails with a generic error on an unknown email', async () => {
    const { useCase } = makeLogin();
    const result = await useCase.execute({ email: 'nobody@example.com', password: 'pw', rememberMe: false, now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails when the email is unverified', async () => {
    const { useCase, users } = makeLogin();
    const user = User.register({
      email: email('a@b.com'),
      password: HashedPassword.fromHash('hashed:pw'),
      role: 'READER',
    }); // unverified
    await users.save(user);
    const result = await useCase.execute({ email: 'a@b.com', password: 'pw', rememberMe: false, now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails when the user is suspended (even if verified)', async () => {
    const { useCase, users } = makeLogin();
    const user = User.fromPersistence({
      id: 'u1' as never,
      email: email('a@b.com'),
      password: HashedPassword.fromHash('hashed:pw'),
      role: 'READER',
      emailVerified: true,
      status: 'SUSPENDED',
    });
    await users.save(user);
    const result = await useCase.execute({ email: 'a@b.com', password: 'pw', rememberMe: false, now: NOW });
    expect(result.ok).toBe(false);
  });
});
