import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PoliciesGuard } from '@kernel/application/authorization/policies.guard';
import { Policies } from '@kernel/application/authorization/policies.decorator';
import { AbilityService } from '@kernel/application/authorization/ability.service';
import { SubjectResolverRegistry } from '@kernel/application/authorization/subject-resolver-registry';
import { UserSubjectResolver } from '@contexts/iam/application/authorization/user-subject-resolver';

const OTHER = 'user-2';

class AdminRoute { @Policies('manage', 'User') handler() {} }
class ProfileRoute { @Policies('update', 'User') handler() {} }
class NoPolicyRoute { handler() {} }
class AssetReadRoute { @Policies('read', 'Asset') handler() {} }
class AssetCreateRoute { @Policies('create', 'Asset') handler() {} }

class StubAssetResolver {
  readonly subject = 'Asset' as const;
  resolve(req: Record<string, unknown>) {
    const params = (req.params ?? {}) as Record<string, string>;
    const session = (req.session ?? {}) as Record<string, string | undefined>;
    if (!params.id) return { id: '', ownerId: session.userId ?? '' };
    return { id: params.id, ownerId: (req.assetOwner ?? '') as string };
  }
}

function ctx(handler: () => void, req: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('PoliciesGuard', () => {
  const reflector = new Reflector();
  const abilities = new AbilityService();
  const registry = new SubjectResolverRegistry();
  registry.register(new UserSubjectResolver(registry));
  const guard = new PoliciesGuard(reflector, abilities, registry);

  it('allows ADMIN to manage User', async () => {
    const route = new AdminRoute();
    const ok = await guard.canActivate(ctx(route.handler, { session: { userId: 'admin', role: 'ADMIN' } }));
    expect(ok).toBe(true);
  });

  it('denies AUTHOR manage User -> ForbiddenException', async () => {
    const route = new AdminRoute();
    await expect(
      guard.canActivate(ctx(route.handler, { session: { userId: 'me', role: 'AUTHOR' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows AUTHOR to update own User (no :id -> resolver returns own id)', async () => {
    const route = new ProfileRoute();
    const ok = await guard.canActivate(ctx(route.handler, { session: { userId: 'me', role: 'AUTHOR' } }));
    expect(ok).toBe(true);
  });

  it('denies AUTHOR updating a foreign user by :id', async () => {
    const route = new ProfileRoute();
    await expect(
      guard.canActivate(ctx(route.handler, { session: { userId: 'me', role: 'AUTHOR' }, params: { id: 'other' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('passes through with no @Policies metadata', async () => {
    const route = new NoPolicyRoute();
    const ok = await guard.canActivate(ctx(route.handler, { session: { userId: 'me', role: 'READER' } }));
    expect(ok).toBe(true);
  });

  it('denies when session lacks role (defensive)', async () => {
    const route = new ProfileRoute();
    await expect(
      guard.canActivate(ctx(route.handler, { session: { userId: 'me' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PoliciesGuard — anonymous public read', () => {
  const reflector = new Reflector();
  const abilities = new AbilityService();
  const registry = new SubjectResolverRegistry();
  registry.register(new UserSubjectResolver(registry));
  registry.register(new StubAssetResolver() as never);
  const guard = new PoliciesGuard(reflector, abilities, registry);

  it('allows anonymous read on Asset (no session)', async () => {
    const route = new AssetReadRoute();
    const ok = await guard.canActivate(ctx(route.handler, { params: { id: 'a1' }, assetOwner: OTHER }));
    expect(ok).toBe(true);
  });

  it('denies anonymous create on Asset (no session)', async () => {
    const route = new AssetCreateRoute();
    await expect(
      guard.canActivate(ctx(route.handler, {})),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows AUTHOR create on Asset (ownerId sourced from session)', async () => {
    const route = new AssetCreateRoute();
    const ok = await guard.canActivate(ctx(route.handler, { session: { userId: 'me', role: 'AUTHOR' } }));
    expect(ok).toBe(true);
  });

  it('denies READER create on Asset', async () => {
    const route = new AssetCreateRoute();
    await expect(
      guard.canActivate(ctx(route.handler, { session: { userId: 'me', role: 'READER' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
