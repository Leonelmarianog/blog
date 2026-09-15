import { Injectable, ForbiddenException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { subject } from '@casl/ability';
import { AbilityService } from './ability.service';
import { SubjectResolverRegistry } from './subject-resolver-registry';
import type { AppSubject, AppSubjectInstance } from '@kernel/domain/authorization/subject';
import type { AppAbility } from './ability.factory';
import { POLICIES_KEY, type PolicyRequirement } from './policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilities: AbilityService,
    private readonly registry: SubjectResolverRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const meta = this.reflector.get<PolicyRequirement>(POLICIES_KEY, context.getHandler());
    if (!meta) return true;

    const role = req.session?.role;
    const userId = req.session?.userId;
    if (!role || !userId) throw new ForbiddenException();

    const ability = this.abilities.build(role, userId);
    const resolved: AppSubjectInstance = await this.registry.resolveFor(meta.subject, req);
    const subjectArg = subject(meta.subject as AppSubject, resolved) as unknown as Parameters<AppAbility['can']>[1];
    if (!ability.can(meta.action, subjectArg)) throw new ForbiddenException();
    return true;
  }
}
