/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeUserRoleUseCase } from '@contexts/iam/application/commands/change-user-role.use-case';
import { User } from '@contexts/iam/domain/user/user.aggregate';
import { HashedPassword } from '@contexts/iam/domain/user/hashed-password.vo';
import { UserRoleChanged } from '@contexts/iam/domain/events/user-events';
import { InMemoryUserRepository, InMemorySessionRepository, FakeUnitOfWork, email, name } from './fakes';

const NOW = new Date('2026-01-01T00:00:00Z');

describe('ChangeUserRoleUseCase', () => {
  it('changes the role AND invalidates the target sessions in one transaction', async () => {
    const users = new InMemoryUserRepository();
    const sessions = new InMemorySessionRepository();
    const uow = new FakeUnitOfWork();
    const user = User.register({ email: email('a@b.com'), password: HashedPassword.fromHash('h'), role: 'READER', displayName: name('Ada') });
    await users.save(user);

    // spy on session invalidation — deleteByUserId must be called with the target's id
    const spy = jest.spyOn(sessions, 'deleteByUserId');

    const useCase = new ChangeUserRoleUseCase(users, sessions, uow);
    const result = await useCase.execute({ targetId: user.id, newRole: 'ADMIN', now: NOW });

    expect(result.ok).toBe(true);
    const reloaded = await users.findById(user.id);
    expect(reloaded?.role).toBe('ADMIN');
    expect(spy).toHaveBeenCalledWith(user.id, undefined);
    expect(uow.dispatched.some((e) => e instanceof UserRoleChanged)).toBe(true);
  });

  it('fails when the user is not found', async () => {
    const users = new InMemoryUserRepository();
    const sessions = new InMemorySessionRepository();
    const uow = new FakeUnitOfWork();
    const useCase = new ChangeUserRoleUseCase(users, sessions, uow);
    const result = await useCase.execute({ targetId: 'nope' as any, newRole: 'ADMIN', now: NOW });
    expect(result.ok).toBe(false);
  });
});
