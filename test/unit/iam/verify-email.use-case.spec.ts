import { VerifyEmailUseCase } from '@contexts/iam/application/commands/verify-email.use-case';
import { TokenService } from '@contexts/iam/application/services/token.service';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { EmailVerified } from '@contexts/iam/domain/events/user-events';
import {
  email,
  InMemoryUserRepository,
  InMemoryTokenRepository,
  FakeUnitOfWork,
  FakeTokenHasher,
} from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');

async function seedVerifiedScenario() {
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryTokenRepository();
  const uow = new FakeUnitOfWork();
  const tokenHasher = new FakeTokenHasher();
  const tokenService = new TokenService(tokenHasher);

  const user = User.register({
    email: email('a@b.com'),
    password: HashedPassword.fromHash('h'),
    role: 'READER',
  });
  await users.save(user);
  const { token, selector, verifier } = tokenService.issue('VERIFICATION', user.id, NOW);
  await tokens.save(token);

  const useCase = new VerifyEmailUseCase(tokens, users, tokenHasher, uow);
  return { useCase, users, tokens, uow, user, selector, verifier };
}

describe('VerifyEmailUseCase', () => {
  it('verifies a valid token, marks the user verified, consumes the token, dispatches EmailVerified', async () => {
    const { useCase, users, tokens, uow, user, selector, verifier } = await seedVerifiedScenario();
    const result = await useCase.execute({ selector, verifier, now: NOW });

    expect(result.ok).toBe(true);
    expect((await users.findById(user.id))?.emailVerified).toBe(true);
    expect((await tokens.findBySelector(selector))?.isUsed()).toBe(true);
    expect(uow.dispatched.some((e) => e instanceof EmailVerified)).toBe(true);
  });

  it('fails on a wrong verifier', async () => {
    const { useCase, selector } = await seedVerifiedScenario();
    const result = await useCase.execute({ selector, verifier: 'wrong', now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails on an unknown selector', async () => {
    const { useCase } = await seedVerifiedScenario();
    const result = await useCase.execute({ selector: 'nope', verifier: 'v', now: NOW });
    expect(result.ok).toBe(false);
  });

  it('fails on an expired token', async () => {
    const users = new InMemoryUserRepository();
    const tokens = new InMemoryTokenRepository();
    const uow = new FakeUnitOfWork();
    const tokenHasher = new FakeTokenHasher();
    const tokenService = new TokenService(tokenHasher);
    const user = User.register({
      email: email('a@b.com'),
      password: HashedPassword.fromHash('h'),
      role: 'READER',
    });
    await users.save(user);
    const past = new Date('2025-12-01T00:00:00Z');
    const issued = tokenService.issue('VERIFICATION', user.id, past); // expiresAt = past + 24h ≈ 2025-12-02
    await tokens.save(issued.token);
    const useCase = new VerifyEmailUseCase(tokens, users, tokenHasher, uow);

    const result = await useCase.execute({ selector: issued.selector, verifier: issued.verifier, now: NOW });
    expect(result.ok).toBe(false); // NOW (2026-01-01) is past expiresAt
  });

  it('fails on an already-used token (single-use, replay-proof)', async () => {
    const { useCase, users, user, selector, verifier } = await seedVerifiedScenario();
    // first consume it
    await useCase.execute({ selector, verifier, now: NOW });
    // replaying the same token must fail (single-use)
    const replay = await useCase.execute({ selector, verifier, now: NOW });
    expect(replay.ok).toBe(false);
    // user stays verified (idempotent)
    expect((await users.findById(user.id))?.emailVerified).toBe(true);
  });
});
