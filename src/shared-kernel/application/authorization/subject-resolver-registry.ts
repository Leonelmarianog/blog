import { Injectable } from '@nestjs/common';
import type { AppSubject, AppSubjectInstance } from '@kernel/domain/authorization/subject';
import type { SubjectResolver } from './subject-resolver.port';

@Injectable()
export class SubjectResolverRegistry {
  private readonly bySubject = new Map<AppSubject, SubjectResolver>();

  register(resolver: SubjectResolver): void {
    this.bySubject.set(resolver.subject, resolver);
  }

  resolveFor(subject: AppSubject, req: Record<string, unknown>): AppSubjectInstance | Promise<AppSubjectInstance> {
    const r = this.bySubject.get(subject);
    return r ? r.resolve(req) : { id: '' };
  }
}
