import { Injectable } from '@nestjs/common';
import { createAbilityFor, type AppAbility } from './ability.factory';
import type { Role } from '@kernel/domain/authorization/role';

@Injectable()
export class AbilityService {
  build(role: Role, userId: string): AppAbility {
    return createAbilityFor(role, userId);
  }
}
