import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { AppSubjectInstance, AppSubject } from '@kernel/domain/authorization/subject';
import type { SubjectResolver } from '@kernel/application/authorization/subject-resolver.port';
import { SubjectResolverRegistry } from '@kernel/application/authorization/subject-resolver-registry';

@Injectable()
export class UserSubjectResolver implements SubjectResolver, OnModuleInit {
  readonly subject: AppSubject = 'User';

  constructor(private readonly registry: SubjectResolverRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  resolve(req: Record<string, unknown>): AppSubjectInstance {
    const params = (req.params ?? {}) as Record<string, string>;
    const session = (req.session ?? {}) as Record<string, string | undefined>;
    return { id: params.id ?? session.userId ?? '' };
  }
}
