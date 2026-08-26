import { Injectable } from '@nestjs/common';
import type { AppSubjectInstance, AppSubject } from '@contexts/iam/domain/authorization/subject';
import type { SubjectResolver } from './subject-resolver.port';

@Injectable()
export class UserSubjectResolver implements SubjectResolver {
  readonly subject: AppSubject = 'User';

  resolve(req: Record<string, unknown>): AppSubjectInstance {
    const params = (req.params ?? {}) as Record<string, string>;
    const session = (req.session ?? {}) as Record<string, string | undefined>;
    return { id: params.id ?? session.userId ?? '' };
  }
}
