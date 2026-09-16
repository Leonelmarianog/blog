import { Injectable } from '@nestjs/common';
import { Identifier } from '@kernel/domain';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/client';
import { AssetMapper } from '../mappers/asset.mapper';
import { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import type { AssetId } from '@contexts/media/domain/asset/asset.types';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import type { AssetRepositoryPort } from '@contexts/media/application/ports/asset.repository.port';

@Injectable()
export class PrismaAssetRepository implements AssetRepositoryPort<Prisma.TransactionClient> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: AssetId, tx?: Prisma.TransactionClient): Promise<Asset | null> {
    const row = await (tx ?? this.prisma).asset.findUnique({ where: { id }, include: { variants: true } });
    return row ? AssetMapper.toDomain(row) : null;
  }

  async save(asset: Asset, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).asset.create({ data: AssetMapper.toPersistence(asset) });
  }

  async update(asset: Asset, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).asset.update({
      where: { id: asset.id },
      data: {
        originalKey: asset.original.key,
        originalMime: asset.original.mime,
        originalSize: asset.original.size,
        originalWidth: asset.original.width,
        originalHeight: asset.original.height,
        updatedAt: asset.updatedAt,
        variants: {
          deleteMany: {},
          createMany: {
            data: asset.variants.map((v) => ({
              id: Identifier.generate<'AssetVariant'>(),
              label: v.label, key: v.key, mime: v.mime, size: v.size, width: v.width, height: v.height,
            })),
          },
        },
      },
    });
  }

  async findByOwnerId(ownerId: UserId, tx?: Prisma.TransactionClient): Promise<Asset[]> {
    const rows = await (tx ?? this.prisma).asset.findMany({ where: { ownerId }, include: { variants: true } });
    return rows.map((r) => AssetMapper.toDomain(r));
  }
}
