import { Identifier } from '@kernel/domain';
import { UploadAssetUseCase } from '@contexts/media/application/commands/upload-asset.use-case';
import { AssetUploaded, AssetVariantAdded } from '@contexts/media/domain/events/asset-events';
import { FakeStorage, FakeImageProcessor, UnparseableImageProcessor, InMemoryAssetRepository, FakeUnitOfWork } from './fakes';

const OWNER = Identifier.from<'User'>('owner-1');
const PNG = Buffer.from('fake-png');

function makeUpload(overrides: { image?: FakeImageProcessor | UnparseableImageProcessor } = {}) {
  const assets = new InMemoryAssetRepository();
  const storage = new FakeStorage();
  const image = overrides.image ?? new FakeImageProcessor();
  const uow = new FakeUnitOfWork();
  const useCase = new UploadAssetUseCase(assets, storage, image, uow);
  return { useCase, assets, storage, image, uow };
}

describe('UploadAssetUseCase', () => {
  it('stores the original + 3 variants, persists the asset, dispatches 4 events', async () => {
    const { useCase, assets, storage, uow } = makeUpload();
    const result = await useCase.execute({ ownerId: OWNER, file: { buffer: PNG, mimetype: 'image/png', size: 1000, originalname: 'cat.png' } });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const asset = await assets.findById(Identifier.from<'Asset'>(result.value.assetId));
    expect(asset).not.toBeNull();
    expect(asset?.variants).toHaveLength(3);

    expect([...storage.puts.keys()].some((k) => k.endsWith('/original.png'))).toBe(true);
    expect([...storage.puts.keys()].filter((k) => k.endsWith('.webp'))).toHaveLength(3);

    expect(uow.dispatched.some((e) => e instanceof AssetUploaded)).toBe(true);
    expect(uow.dispatched.filter((e) => e instanceof AssetVariantAdded)).toHaveLength(3);
  });

  it('fails on an unparseable image and writes nothing to storage', async () => {
    const { useCase, storage } = makeUpload({ image: new UnparseableImageProcessor() });
    const result = await useCase.execute({ ownerId: OWNER, file: { buffer: Buffer.from('not-an-image'), mimetype: 'image/png', size: 10, originalname: 'x.png' } });
    expect(result.ok).toBe(false);
    expect(storage.puts.size).toBe(0);
  });

  it('fails on an unsupported mime and writes nothing to storage', async () => {
    const { useCase, storage } = makeUpload();
    const result = await useCase.execute({ ownerId: OWNER, file: { buffer: PNG, mimetype: 'image/gif', size: 10, originalname: 'x.gif' } });
    expect(result.ok).toBe(false);
    expect(storage.puts.size).toBe(0);
  });
});
