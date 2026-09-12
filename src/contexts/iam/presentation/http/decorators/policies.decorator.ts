import { SetMetadata } from '@nestjs/common';
import type { AppAction, AppSubject } from '@contexts/iam/application/authorization';

export const POLICIES_KEY = 'policies';
export interface PolicyRequirement {
  action: AppAction;
  subject: AppSubject;
}

export const Policies = (action: AppAction, subject: AppSubject) =>
  SetMetadata(POLICIES_KEY, { action, subject } satisfies PolicyRequirement);
