import type { AppSubject, AppSubjectInstance } from '@kernel/domain/authorization/subject';

export interface SubjectResolver {
  readonly subject: AppSubject;
  resolve(req: Record<string, unknown>): AppSubjectInstance | Promise<AppSubjectInstance>;
}
