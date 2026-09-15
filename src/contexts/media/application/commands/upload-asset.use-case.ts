import { UseCase, ok, fail, type Result, type UnitOfWorkPort } from '@kernel/application';
import { DomainError, Identifier } from '@kernel/domain';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import { OriginalFile } from '../../domain/asset/original-file.vo';
import { Variant } from '../../domain/asset/variant.vo';
import { Asset } from '../../domain/asset/asset.aggregate';
import type { AssetRepositoryPort, StoragePort, ImageProcessorPort } from '../ports';
import { VARIANT_SPECS } from './variant-specs';

export interface UploadAssetInput {
  ownerId: UserId;
  file: { buffer: Buffer; mimetype: string; size: number; originalname: string };
}
export interface UploadAssetOutput { assetId: string; }

const EXT_BY_MIME: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export class UploadAssetUseCase extends UseCase<UploadAssetInput, UploadAssetOutput> {
  constructor(
    private readonly assets: AssetRepositoryPort,
    private readonly storage: StoragePort,
    private readonly imageProcessor: ImageProcessorPort,
    private readonly uow: UnitOfWorkPort<unknown>,
  ) {
    super();
  }

  async execute(input: UploadAssetInput): Promise<Result<UploadAssetOutput, DomainError>> {
    const { buffer, mimetype, size } = input.file;

    let meta: { width: number; height: number; mime: string };
    try {
      meta = await this.imageProcessor.metadata(buffer);
    } catch {
      return fail(new DomainError('Invalid image'));
    }

    const assetId = Identifier.generate<'Asset'>();
    const ext = EXT_BY_MIME[mimetype] ?? 'bin';
    const originalKey = `assets/${assetId}/original.${ext}`;
    const ofResult = OriginalFile.create({ key: originalKey, mime: mimetype, size, width: meta.width, height: meta.height });
    if (!ofResult.ok) return fail(ofResult.error);
    const original = ofResult.value;

    const asset = Asset.upload({ ownerId: input.ownerId, original });

    await this.storage.put(original.key, buffer, mimetype);

    let rendered;
    try {
      rendered = await this.imageProcessor.variants(buffer, [...VARIANT_SPECS]);
    } catch {
      return fail(new DomainError('Variant generation failed'));
    }

    for (const v of rendered) {
      const vkey = `assets/${assetId}/${v.label}.webp`;
      await this.storage.put(vkey, v.buffer, v.mime);
      const vrResult = Variant.create({ key: vkey, label: v.label, mime: v.mime, size: v.size, width: v.width, height: v.height });
      if (!vrResult.ok) return fail(vrResult.error);
      asset.addVariant(vrResult.value);
    }

    this.uow.collect(asset);
    const id = await this.uow.run(async (tx) => {
      await this.assets.save(asset, tx);
      return asset.id;
    });
    return ok({ assetId: id });
  }
}
