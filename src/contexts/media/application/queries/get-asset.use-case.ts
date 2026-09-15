import { UseCase, ok, fail, type Result } from '@kernel/application';
import { DomainError } from '@kernel/domain';
import type { AssetId } from '../../domain/asset/asset.types';
import type { Asset } from '../../domain/asset/asset.aggregate';
import type { AssetRepositoryPort } from '../ports/asset.repository.port';
import type { StoragePort } from '../ports/storage.port';

export interface GetAssetInput {
  id: AssetId;
}

export interface AssetVariantView {
  label: string;
  url: string;
  width: number;
  height: number;
}

export interface GetAssetOutput {
  id: string;
  originalUrl: string;
  originalMime: string;
  originalWidth: number;
  originalHeight: number;
  variants: AssetVariantView[];
}

export class GetAssetUseCase extends UseCase<GetAssetInput, GetAssetOutput> {
  constructor(
    private readonly assets: AssetRepositoryPort,
    private readonly storage: StoragePort,
  ) {
    super();
  }

  async execute(input: GetAssetInput): Promise<Result<GetAssetOutput, DomainError>> {
    const asset: Asset | null = await this.assets.findById(input.id);
    if (!asset) return fail(new DomainError('Asset not found'));

    return ok({
      id: asset.id,
      originalUrl: this.storage.publicUrl(asset.original.key),
      originalMime: asset.original.mime,
      originalWidth: asset.original.width,
      originalHeight: asset.original.height,
      variants: asset.variants.map((v) => ({
        label: v.label,
        url: this.storage.publicUrl(v.key),
        width: v.width,
        height: v.height,
      })),
    });
  }
}
