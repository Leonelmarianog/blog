import { Injectable, Inject, ForbiddenException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { subject } from '@casl/ability';
import { AbilityService } from '@contexts/iam/application/authorization/ability.service';
import { SUBJECT_RESOLVERS, type SubjectResolver } from '@contexts/iam/application/authorization/subject-resolver.port';
import type { AppSubject, AppAbility } from '@contexts/iam/application/authorization';
import { POLICIES_KEY, type PolicyRequirement } from '../decorators/policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  private readonly resolverBySubject: Map<AppSubject, SubjectResolver>;

  constructor(
    private readonly reflector: Reflector,
    private readonly abilities: AbilityService,
    @Inject(SUBJECT_RESOLVERS) resolvers: SubjectResolver[],
  ) {
    this.resolverBySubject = new Map(resolvers.map((r) => [r.subject, r]));
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const meta = this.reflector.get<PolicyRequirement>(POLICIES_KEY, context.getHandler());
    if (!meta) return true; // no @Policies -> authz not required (SessionGuard alone governs authn)

    const role = req.session?.role;
    const userId = req.session?.userId;
    if (!role || !userId) throw new ForbiddenException();

    const ability = this.abilities.build(role, userId);
    const resolver = this.resolverBySubject.get(meta.subject);
    // Tag the resolved instance with CASL's subject() so detectSubjectType sees
    // 'User' rather than the plain object's constructor name ('Object'); an
    // un-tagged { id } matches NO 'User' rule and would deny owners their own
    // profile. 'User' is the only resolver registered in Plan 5, so the cast
    // is accurate; AppAbility's subject param is `AppSubject | UserSubject`.
    const subjectArg: Parameters<AppAbility['can']>[1] = resolver
      ? subject(meta.subject as 'User', await resolver.resolve(req))
      : meta.subject;
    if (!ability.can(meta.action, subjectArg)) throw new ForbiddenException();
    return true;
  }
}
