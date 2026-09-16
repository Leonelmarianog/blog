import { PrismaAssetRepository } from '@infra/persistence/repositories/asset.repository';
import { PrismaService } from '@infra/persistence/prisma/prisma.service';
import { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';
import { Identifier } from '@kernel/domain';

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

const OWNER = Identifier.from<'User'>('owner-1');
function okOriginal() {
  const r = OriginalFile.create({ key: 'assets/a/original.png', mime: 'image/png', size: 1000, width: 1000, height: 800 });
  if (!r.ok) throw new Error('fixture'); return r.value;
}

function stubClient(): PrismaService {
  const assets = {} as Record<string, Row>;
  const variants = {} as Record<string, Row>;
  const client = {
    asset: {
      findUnique: jest.fn(async (arg: { where: Where; include?: unknown }) => {
        const a = assets[String(arg.where.id)];
        if (!a) return null;
        return { ...a, variants: Object.values(variants).filter((v) => v.assetId === a.id) };
      }),
      create: jest.fn(async (arg: { data: Row }) => {
        const id = String(arg.data.id);
        assets[id] = { ...arg.data };
        // Prisma sets the relation FK implicitly on nested creates; the stub mirrors that
        // so findById's `v.assetId === a.id` filter resolves the variants back to the asset.
        const nested = (arg.data.variants as { create?: Row[] } | undefined)?.create ?? [];
        for (const v of nested) { variants[String(v.id)] = { ...v, assetId: id }; }
        return arg.data;
      }),
      update: jest.fn(async (arg: { where: Where; data: Row }) => {
        const id = String(arg.where.id);
        assets[id] = { ...assets[id], ...arg.data };
        return assets[id];
      }),
      findMany: jest.fn(async (arg: { where: Where }) =>
        Object.values(assets).filter((a) => a.ownerId === arg.where.ownerId).map((a) => ({ ...a, variants: Object.values(variants).filter((v) => v.assetId === a.id) }))),
    },
    assetVariant: { deleteMany: jest.fn(async () => ({ count: 0 })) },
  };
  return client as unknown as PrismaService;
}

describe('PrismaAssetRepository', () => {
  it('save persists and findById reads back with variants', async () => {
    const repo = new PrismaAssetRepository(stubClient());
    const asset = Asset.upload({ ownerId: OWNER, original: okOriginal() });
    await repo.save(asset);
    const found = await repo.findById(asset.id);
    expect(found).not.toBeNull();
    expect(found?.original.mime).toBe('image/png');
    expect(found?.variants).toHaveLength(0);
  });

  it('findByOwnerId returns only that owner\'s assets', async () => {
    const repo = new PrismaAssetRepository(stubClient());
    const a1 = Asset.upload({ ownerId: OWNER, original: okOriginal() });
    const a2 = Asset.upload({ ownerId: Identifier.from<'User'>('other'), original: okOriginal() });
    await repo.save(a1); await repo.save(a2);
    expect((await repo.findByOwnerId(OWNER)).map((a) => a.id)).toEqual([a1.id]);
  });
});
