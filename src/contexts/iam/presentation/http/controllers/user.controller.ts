import { Controller, Get, Post, Param, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ListUsersUseCase } from '@contexts/iam/application/queries/list-users.use-case';
import { SuspendUserUseCase } from '@contexts/iam/application/commands/suspend-user.use-case';
import { UnsuspendUserUseCase } from '@contexts/iam/application/commands/unsuspend-user.use-case';
import { ChangeUserRoleUseCase } from '@contexts/iam/application/commands/change-user-role.use-case';
import { SessionGuard } from '@kernel/application/authorization/session.guard';
import { PoliciesGuard } from '@kernel/application/authorization/policies.guard';
import { Policies } from '@kernel/application/authorization/policies.decorator';
import { FormView } from '@bootstrap/exceptions/form-view.decorator';
import { ChangeRoleDto } from '../dto/change-role.dto';
import type { AuthRequest, AuthResponse } from './auth.controller';
export type { AuthRequest, AuthResponse };

@Controller('admin/users')
@UseGuards(SessionGuard, PoliciesGuard)
export class UserController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly suspendUser: SuspendUserUseCase,
    private readonly unsuspendUser: UnsuspendUserUseCase,
    private readonly changeUserRole: ChangeUserRoleUseCase,
  ) {}

  @Get()
  @Policies('manage', 'User')
  async list(@Query() _q: { page?: string; pageSize?: string }, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const page = Number(_q.page ?? 1) || 1;
    const pageSize = Number(_q.pageSize ?? 20) || 20;
    const result = await this.listUsers.execute({ page, pageSize });
    if (!result.ok) {
      res.redirect(302, '/admin/users');
      return;
    }
    res.render('iam/admin/users', {
      title: 'Users',
      csrfToken: res.locals.csrfToken,
      flash: res.locals.flash,
      users: result.value.items,
      total: result.value.total,
      page,
      pageSize,
      isAdmin: req.session?.role === 'ADMIN',
      currentNav: 'admin',
    });
  }

  @Post(':id/suspend')
  @Policies('manage', 'User')
  async suspend(@Param('id') _id: string, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const result = await this.suspendUser.execute({ targetId: _id as never, now: new Date() });
    if (result.ok) req.flash('success', 'User suspended.');
    else req.flash('error', result.error.message);
    res.redirect(302, '/admin/users');
  }

  @Post(':id/unsuspend')
  @Policies('manage', 'User')
  async unsuspend(@Param('id') _id: string, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const result = await this.unsuspendUser.execute({ targetId: _id as never });
    if (result.ok) req.flash('success', 'User reactivated.');
    else req.flash('error', result.error.message);
    res.redirect(302, '/admin/users');
  }

  @Post(':id/role')
  @Policies('manage', 'User')
  @FormView('iam/admin/users')
  async changeRole(@Param('id') _id: string, @Body() dto: ChangeRoleDto, @Req() req: AuthRequest, @Res() res: AuthResponse): Promise<void> {
    const result = await this.changeUserRole.execute({ targetId: _id as never, newRole: dto.role, now: new Date() });
    if (result.ok) {
      req.flash('success', 'Role updated.');
      res.redirect(302, '/admin/users');
    } else {
      req.flash('error', result.error.message);
      res.redirect(302, '/admin/users');
    }
  }
}
