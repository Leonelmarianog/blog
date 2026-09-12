import type { AppSubject, AppSubjectInstance } from '@contexts/iam/domain/authorization/subject';

export const SUBJECT_RESOLVERS = Symbol('SUBJECT_RESOLVERS');

export interface SubjectResolver {
  readonly subject: AppSubject;
  resolve(req: Record<string, unknown>): AppSubjectInstance | Promise<AppSubjectInstance>;
}
