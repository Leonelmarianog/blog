import { Injectable, Inject } from '@nestjs/common';
import type { AppSubjectInstance, AppSubject } from '@kernel/domain/authorization/subject';
import type { SubjectResolver } from '@kernel/application/authorization/subject-resolver.port';
import { SubjectResolverRegistry } from '@kernel/application/authorization/subject-resolver-registry';
import { ASSET_REPOSITORY } from '../ports/asset.repository.port';
import type { AssetRepositoryPort } from '../ports/asset.repository.port';
import type { AssetId } from '../../domain/asset/asset.types';

@Injectable()
export class AssetSubjectResolver implements SubjectResolver {
  readonly subject = 'Asset' as const satisfies AppSubject;

  constructor(
    private readonly registry: SubjectResolverRegistry,
    @Inject(ASSET_REPOSITORY) private readonly assets: AssetRepositoryPort,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async resolve(req: Record<string, unknown>): Promise<AppSubjectInstance> {
    const params = (req.params ?? {}) as Record<string, string>;
    const session = (req.session ?? {}) as Record<string, string | undefined>;
    const id = params.id;
    if (!id) return { id: '', ownerId: session.userId ?? '' };
    const asset = await this.assets.findById(id as AssetId);
    return asset ? { id: asset.id, ownerId: asset.ownerId } : { id };
  }
}
