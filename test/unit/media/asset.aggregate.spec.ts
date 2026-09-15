import { Identifier } from '@kernel/domain';
import { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';
import { Variant } from '@contexts/media/domain/asset/variant.vo';
import { AssetUploaded, AssetVariantAdded } from '@contexts/media/domain/events/asset-events';

const OWNER = Identifier.from<'User'>('owner-1');
function okOriginal() {
  const r = OriginalFile.create({ key: 'assets/a/original.png', mime: 'image/png', size: 1000, width: 1000, height: 800 });
  if (!r.ok) throw new Error('fixture');
  return r.value;
}
function okVariant(label: 'thumbnail' | 'medium' | 'large', width: number, height: number) {
  const r = Variant.create({ key: `assets/a/${label}.webp`, label, mime: 'image/webp', size: 100, width, height });
  if (!r.ok) throw new Error('fixture');
  return r.value;
}

describe('Asset aggregate', () => {
  it('upload creates an asset with no variants and emits AssetUploaded', () => {
    const asset = Asset.upload({ ownerId: OWNER, original: okOriginal() });
    expect(asset.ownerId).toBe(OWNER);
    expect(asset.variants).toHaveLength(0);
    expect(asset.domainEvents.some((e) => e instanceof AssetUploaded)).toBe(true);
  });

  it('fromPersistence reconstitutes without emitting events', () => {
    const asset = Asset.fromPersistence({
      id: Identifier.from<'Asset'>('a1'),
      ownerId: OWNER,
      original: okOriginal(),
      variants: [okVariant('thumbnail', 300, 240)],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    });
    expect(asset.id).toBe(Identifier.from<'Asset'>('a1'));
    expect(asset.variants).toHaveLength(1);
    expect(asset.domainEvents).toHaveLength(0);
  });

  it('addVariant appends and emits AssetVariantAdded', () => {
    const asset = Asset.upload({ ownerId: OWNER, original: okOriginal() });
    asset.clearDomainEvents();
    asset.addVariant(okVariant('thumbnail', 300, 240));
    expect(asset.variants).toHaveLength(1);
    expect(asset.updatedAt).toBeInstanceOf(Date);
    expect(asset.domainEvents.some((e) => e instanceof AssetVariantAdded)).toBe(true);
  });

  it('addVariant throws on a duplicate label', () => {
    const asset = Asset.upload({ ownerId: OWNER, original: okOriginal() });
    asset.addVariant(okVariant('thumbnail', 300, 240));
    expect(() => asset.addVariant(okVariant('thumbnail', 280, 220))).toThrow();
  });

  it('addVariant throws on upscaling beyond the original', () => {
    const asset = Asset.upload({ ownerId: OWNER, original: okOriginal() }); // 1000x800
    expect(() => asset.addVariant(okVariant('large', 1600, 1200))).toThrow();
  });
});
