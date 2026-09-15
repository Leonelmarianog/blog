import { Identifier } from '@kernel/domain';
import { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';
import { Variant } from '@contexts/media/domain/asset/variant.vo';
import { AssetMapper } from '@infra/persistence/mappers/asset.mapper';

const OWNER = Identifier.from<'User'>('owner-1');

function okOriginal() {
  const r = OriginalFile.create({ key: 'assets/a/original.png', mime: 'image/png', size: 1000, width: 1000, height: 800 });
  if (!r.ok) throw new Error('fixture'); return r.value;
}
function okVariant(label: 'thumbnail' | 'medium' | 'large', w: number, h: number) {
  const r = Variant.create({ key: `assets/a/${label}.webp`, label, mime: 'image/webp', size: 100, width: w, height: h });
  if (!r.ok) throw new Error('fixture'); return r.value;
}

describe('AssetMapper', () => {
  it('round-trips an asset with variants', () => {
    const asset = Asset.upload({ ownerId: OWNER, original: okOriginal() });
    asset.addVariant(okVariant('thumbnail', 300, 240));
    asset.addVariant(okVariant('medium', 800, 640));

    const persisted = AssetMapper.toPersistence(asset);
    expect(persisted.id).toBe(asset.id);
    expect(persisted.originalKey).toBe('assets/a/original.png');
    // `variants.create` is a Prisma union (single | array | nested); the mapper always
    // builds an array, so narrow it via a typed cast to satisfy the compiler.
    const created = (persisted.variants?.create ?? []) as unknown as Array<{
      id: string; assetId: string; label: string; key: string; mime: string; size: number; width: number; height: number;
    }>;
    expect(created).toHaveLength(2);

    const row = {
      id: asset.id, ownerId: OWNER, originalKey: persisted.originalKey, originalMime: persisted.originalMime,
      originalSize: persisted.originalSize, originalWidth: persisted.originalWidth, originalHeight: persisted.originalHeight,
      createdAt: asset.createdAt, updatedAt: asset.updatedAt,
      variants: created.map((v) => ({ id: v.id, assetId: v.assetId, label: v.label, key: v.key, mime: v.mime, size: v.size, width: v.width, height: v.height })),
    };
    const restored = AssetMapper.toDomain(row as never);
    expect(restored.id).toBe(asset.id);
    expect(restored.ownerId).toBe(OWNER);
    expect(restored.original.mime).toBe('image/png');
    expect(restored.variants).toHaveLength(2);
    expect(restored.variants.map((v) => v.label)).toEqual(['thumbnail', 'medium']);
  });
});
