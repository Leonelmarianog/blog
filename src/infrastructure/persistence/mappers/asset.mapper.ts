import { Identifier } from '@kernel/domain';
import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';
import { Variant } from '@contexts/media/domain/asset/variant.vo';
import { Asset, type AssetPersistenceProps } from '@contexts/media/domain/asset/asset.aggregate';
import type { Prisma } from '../prisma/client';

type AssetRow = Prisma.AssetGetPayload<{ include: { variants: true } }>;

export const AssetMapper = {
  toPersistence(asset: Asset): Prisma.AssetUncheckedCreateInput {
    return {
      id: asset.id,
      ownerId: asset.ownerId,
      originalKey: asset.original.key,
      originalMime: asset.original.mime,
      originalSize: asset.original.size,
      originalWidth: asset.original.width,
      originalHeight: asset.original.height,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      variants: {
        create: asset.variants.map((v) => ({
          id: Identifier.generate<'AssetVariant'>(),
          assetId: asset.id,
          label: v.label,
          key: v.key,
          mime: v.mime,
          size: v.size,
          width: v.width,
          height: v.height,
        })),
      },
    };
  },

  toDomain(row: AssetRow): Asset {
    const original = OriginalFile.fromPersistence({
      key: row.originalKey, mime: row.originalMime, size: row.originalSize, width: row.originalWidth, height: row.originalHeight,
    });
    const variants = row.variants.map((vr) =>
      Variant.fromPersistence({ key: vr.key, label: vr.label as 'thumbnail' | 'medium' | 'large', mime: vr.mime, size: vr.size, width: vr.width, height: vr.height }),
    );
    const props: AssetPersistenceProps = {
      id: Identifier.from<'Asset'>(row.id),
      ownerId: Identifier.from<'User'>(row.ownerId),
      original,
      variants,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    return Asset.fromPersistence(props);
  },
};
