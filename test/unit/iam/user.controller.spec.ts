import { UserController, type AuthRequest, type AuthResponse } from '@contexts/iam/presentation/http/controllers/user.controller';
import type { ListUsersUseCase } from '@contexts/iam/application/queries/list-users.use-case';
import type { SuspendUserUseCase } from '@contexts/iam/application/commands/suspend-user.use-case';
import type { UnsuspendUserUseCase } from '@contexts/iam/application/commands/unsuspend-user.use-case';
import type { ChangeUserRoleUseCase } from '@contexts/iam/application/commands/change-user-role.use-case';
import { ok, type Result } from '@kernel/application';
import { DomainError } from '@kernel/domain';

type UseCaseMock = { execute: jest.Mock };
function mockUseCase(result: Result<unknown, DomainError>): UseCaseMock {
  return { execute: jest.fn(async () => result) };
}

function mkRes(): AuthResponse {
  return {
    locals: { csrfToken: 'csrf', flash: [] },
    redirect: jest.fn(),
    render: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as AuthResponse;
}

describe('UserController', () => {
  function makeController(list: UseCaseMock, suspend: UseCaseMock, unsuspend: UseCaseMock, changeRole: UseCaseMock) {
    return new UserController(
      list as unknown as ListUsersUseCase,
      suspend as unknown as SuspendUserUseCase,
      unsuspend as unknown as UnsuspendUserUseCase,
      changeRole as unknown as ChangeUserRoleUseCase,
    );
  }

  it('GET /admin/users renders the list with items + isAdmin', async () => {
    const list = mockUseCase(ok({ items: [{ id: 'u1', email: 'a@b.com', role: 'READER', status: 'ACTIVE', emailVerified: true, displayName: 'Ada' }], total: 1 }));
    const controller = makeController(list, mockUseCase(ok({})), mockUseCase(ok({})), mockUseCase(ok({})));
    const req = { session: { userId: 'admin', role: 'ADMIN' }, query: {} } as unknown as AuthRequest;
    const res = mkRes();
    // R2: pass ALL positional params (decorators are inert in unit tests).
    // list(@Query() _q, @Req() req, @Res() res) -> controller.list({}, req, res)
    await controller.list({}, req, res);
    expect(res.render).toHaveBeenCalledWith('iam/admin/users', expect.objectContaining({ users: expect.any(Array), isAdmin: true }));
  });

  it('POST /admin/users/:id/role with valid role redirects to the list', async () => {
    const changeRole = mockUseCase(ok({ userId: 'u1' }));
    const controller = makeController(mockUseCase(ok({})), mockUseCase(ok({})), mockUseCase(ok({})), changeRole);
    const req = { body: { role: 'AUTHOR' }, params: { id: 'u1' }, session: { userId: 'admin', role: 'ADMIN' }, flash: jest.fn() } as unknown as AuthRequest;
    const res = mkRes();
    // R2: changeRole(@Param('id') _id, @Body() dto, @Req() req, @Res() res) -> controller.changeRole('u1', { role: 'AUTHOR' }, req, res)
    await controller.changeRole('u1', { role: 'AUTHOR' }, req, res);
    expect(changeRole.execute).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'u1', newRole: 'AUTHOR' }));
    expect(res.redirect).toHaveBeenCalledWith(302, '/admin/users');
  });

  it('POST /admin/users/:id/suspend redirects to the list on success', async () => {
    const suspend = mockUseCase(ok({ userId: 'u1' }));
    const controller = makeController(mockUseCase(ok({})), suspend, mockUseCase(ok({})), mockUseCase(ok({})));
    const req = { body: {}, params: { id: 'u1' }, session: { userId: 'admin', role: 'ADMIN' }, flash: jest.fn() } as unknown as AuthRequest;
    const res = mkRes();
    // R2: suspend(@Param('id') _id, @Req() req, @Res() res) -> controller.suspend('u1', req, res)
    await controller.suspend('u1', req, res);
    expect(suspend.execute).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(302, '/admin/users');
  });
});
