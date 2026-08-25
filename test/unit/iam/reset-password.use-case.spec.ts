import { ResetPasswordUseCase } from '@contexts/iam/application/commands/reset-password.use-case';
import { PasswordHasherService } from '@contexts/iam/application/services/password-hasher.service';
import { TokenService } from '@contexts/iam/application/services/token.service';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { PasswordReset } from '@contexts/iam/domain/events/user-events';
import { Session } from '@contexts/iam/domain/session/session.entity';
import {
  email,
  InMemoryUserRepository,
  InMemoryTokenRepository,
  InMemorySessionRepository,
  FakeUnitOfWork,
  FakePasswordHasher,
  FakeTokenHasher,
} from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');

async function makeReset() {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryTokenRepository();
  const sessions = new InMemorySessionRepository();
  const uow = new FakeUnitOfWork();
  const passwordHasher = new PasswordHasherService(new FakePasswordHasher());
  const tokenHasher = new FakeTokenHasher();
  const tokenService = new TokenService(tokenHasher);

  const user = User.register({
    email: email('a@b.com'),
    password: HashedPassword.fromHash('hashed:old'),
    role: 'READER',
  });
  user.verifyEmail();
  await users.save(user);
  const issued = tokenService.issue('RESET', user.id, NOW);
  await tokens.save(issued.token);

  const useCase = new ResetPasswordUseCase(tokens, users, sessions, passwordHasher, tokenHasher, uow);
  return { useCase, users, tokens, sessions, uow, user, selector: issued.selector, verifier: issued.verifier };
}

describe('ResetPasswordUseCase', () => {
  it('resets the password, consumes the token, invalidates all sessions, dispatches PasswordReset', async () => {
    const { useCase, users, tokens, sessions, uow, user, selector, verifier } = await makeReset();
    // seed two active sessions for the user
    const s1 = Session.create({ userId: user.id, seriesHash: 'sh1', tokenHash: 'th1', expiresAt: new Date('2026-02-01T00:00:00Z'), now: NOW });
    const s2 = Session.create({ userId: user.id, seriesHash: 'sh2', tokenHash: 'th2', expiresAt: new Date('2026-02-01T00:00:00Z'), now: NOW });
    await sessions.save(s1);
    await sessions.save(s2);
    expect(await sessions.findByUserId(user.id)).toHaveLength(2);

    const result = await useCase.execute({ selector, verifier, newPassword: 'newpw', now: NOW });
    expect(result.ok).toBe(true);
    expect((await users.findById(user.id))?.password.hash).toBe('hashed:newpw');
    expect((await tokens.findBySelector(selector))?.isUsed()).toBe(true);
    expect(await sessions.findByUserId(user.id)).toHaveLength(0); // all sessions invalidated
    expect(uow.dispatched.some((e) => e instanceof PasswordReset)).toBe(true);
  });

  it('fails on a wrong verifier and leaves the password unchanged', async () => {
    const { useCase, users, user, selector } = await makeReset();
    const before = (await users.findById(user.id))?.password.hash;
    const result = await useCase.execute({ selector, verifier: 'wrong', newPassword: 'newpw', now: NOW });
    expect(result.ok).toBe(false);
    expect((await users.findById(user.id))?.password.hash).toBe(before);
  });

  it('fails on an unknown selector', async () => {
    const { useCase } = await makeReset();
    const result = await useCase.execute({ selector: 'nope', verifier: 'v', newPassword: 'newpw', now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails on an expired reset token', async () => {
    const users = new InMemoryUserRepository();
    const tokens = new InMemoryTokenRepository();
    const sessions = new InMemorySessionRepository();
    const uow = new FakeUnitOfWork();
    const passwordHasher = new PasswordHasherService(new FakePasswordHasher());
    const tokenHasher = new FakeTokenHasher();
    const tokenService = new TokenService(tokenHasher);
    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER' });
    user.verifyEmail();
    await users.save(user);
    const past = new Date('2025-12-01T00:00:00Z');
    const issued = tokenService.issue('RESET', user.id, past); // expiresAt = past + 1h
    await tokens.save(issued.token);
    const useCase = new ResetPasswordUseCase(tokens, users, sessions, passwordHasher, tokenHasher, uow);

    const result = await useCase.execute({ selector: issued.selector, verifier: issued.verifier, newPassword: 'newpw', now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails on an already-used reset token (single-use)', async () => {
    const { useCase, users, user, selector, verifier } = await makeReset();
    await useCase.execute({ selector, verifier, newPassword: 'first', now: NOW });
    const replay = await useCase.execute({ selector, verifier, newPassword: 'second', now: NOW });
    expect(replay.ok).toBe(false);
    expect((await users.findById(user.id))?.password.hash).toBe('hashed:first');
  });
});
