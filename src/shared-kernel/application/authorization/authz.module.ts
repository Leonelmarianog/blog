import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityService } from './ability.service';
import { SubjectResolverRegistry } from './subject-resolver-registry';
import { PoliciesGuard } from './policies.guard';
import { SessionGuard } from './session.guard';

@Global()
@Module({
  providers: [AbilityService, SubjectResolverRegistry, PoliciesGuard, SessionGuard, Reflector],
  exports: [AbilityService, SubjectResolverRegistry, PoliciesGuard, SessionGuard, Reflector],
})
export class SharedAuthzModule {}
