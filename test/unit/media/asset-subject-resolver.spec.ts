import { AssetSubjectResolver } from '@contexts/media/application/authorization/asset-subject-resolver';
import { SubjectResolverRegistry } from '@kernel/application/authorization/subject-resolver-registry';
import { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';
import { Identifier } from '@kernel/domain';
import { InMemoryAssetRepository } from './fakes';

const OWNER = Identifier.from<'User'>('owner-1');

function registry() {
  return new SubjectResolverRegistry();
}
async function seedAsset(assets: InMemoryAssetRepository) {
  const orig = OriginalFile.create({ key: 'assets/a/o.png', mime: 'image/png', size: 1, width: 1, height: 1 });
  if (!orig.ok) throw new Error('fixture');
  const a = Asset.upload({ ownerId: OWNER, original: orig.value });
  await assets.save(a);
  return a;
}

describe('AssetSubjectResolver', () => {
  it('registers itself with the registry on construction-style call', async () => {
    const reg = registry();
    const assets = new InMemoryAssetRepository();
    const resolver = new AssetSubjectResolver(reg, assets);
    resolver.onModuleInit();
    expect(reg.resolveFor('Asset', { params: {} })).resolves.toEqual({ id: '', ownerId: '' });
  });

  it('returns { id, ownerId } for a known asset', async () => {
    const reg = registry();
    const assets = new InMemoryAssetRepository();
    const asset = await seedAsset(assets);
    const resolver = new AssetSubjectResolver(reg, assets);
    const out = await resolver.resolve({ params: { id: asset.id } });
    expect(out).toEqual({ id: asset.id, ownerId: OWNER });
  });

  it('returns { id } for an unknown asset id', async () => {
    const reg = registry();
    const resolver = new AssetSubjectResolver(reg, new InMemoryAssetRepository());
    const out = await resolver.resolve({ params: { id: 'missing' } });
    expect(out).toEqual({ id: 'missing' });
  });

  it('returns { id: "", ownerId } for the no-:id branch (create guard)', async () => {
    const reg = registry();
    const resolver = new AssetSubjectResolver(reg, new InMemoryAssetRepository());
    const out = await resolver.resolve({ params: {}, session: { userId: OWNER } });
    expect(out).toEqual({ id: '', ownerId: OWNER });
  });
});
