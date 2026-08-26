import { Injectable } from '@nestjs/common';
import { createAbilityFor, type AppAbility } from '@contexts/iam/domain/authorization/ability.factory';
import type { Role } from '@contexts/iam/domain/authorization/role';

@Injectable()
export class AbilityService {
  build(role: Role, userId: string): AppAbility {
    return createAbilityFor(role, userId);
  }
}
