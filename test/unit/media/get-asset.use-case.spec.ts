import { GetAssetUseCase } from '@contexts/media/application/queries/get-asset.use-case';
import { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';
import { Variant } from '@contexts/media/domain/asset/variant.vo';
import { Identifier } from '@kernel/domain';
import { InMemoryAssetRepository, FakeStorage } from './fakes';

const OWNER = Identifier.from<'User'>('owner-1');

function makeAsset() {
  const orig = OriginalFile.create({ key: 'assets/a/original.png', mime: 'image/png', size: 1000, width: 1000, height: 800 });
  if (!orig.ok) throw new Error('fixture');
  const a = Asset.upload({ ownerId: OWNER, original: orig.value });
  const v = Variant.create({ key: 'assets/a/thumbnail.webp', label: 'thumbnail', mime: 'image/webp', size: 50, width: 300, height: 240 });
  if (!v.ok) throw new Error('fixture');
  a.addVariant(v.value);
  return a;
}

describe('GetAssetUseCase', () => {
  it('returns the asset with original + variant public URLs', async () => {
    const assets = new InMemoryAssetRepository();
    const storage = new FakeStorage();
    const useCase = new GetAssetUseCase(assets, storage);
    const asset = makeAsset();
    await assets.save(asset);
    const r = await useCase.execute({ id: asset.id });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.originalUrl).toBe(storage.publicUrl(asset.original.key));
    expect(r.value.variants).toHaveLength(1);
    expect(r.value.variants[0].url).toBe(storage.publicUrl('assets/a/thumbnail.webp'));
    expect(r.value.variants[0].width).toBe(300);
  });

  it('fails when the asset is not found', async () => {
    const useCase = new GetAssetUseCase(new InMemoryAssetRepository(), new FakeStorage());
    const r = await useCase.execute({ id: Identifier.from<'Asset'>('nope') });
    expect(r.ok).toBe(false);
  });
});
