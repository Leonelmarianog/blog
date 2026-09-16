import type { DomainEvent } from '@kernel/domain';
import type { UnitOfWorkPort, EventCollector } from '@kernel/application';
import type { Asset } from '@contexts/media/domain/asset/asset.aggregate';
import type { AssetId } from '@contexts/media/domain/asset/asset.types';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import type { AssetRepositoryPort, StoragePort, ImageProcessorPort, ProcessedVariant, ImageVariantSpec } from '@contexts/media/application/ports';

export class FakeStorage implements StoragePort {
  puts = new Map<string, { body: Buffer; contentType: string }>();
  deletes: string[] = [];
  async put(key: string, body: Buffer, contentType: string) {
    this.puts.set(key, { body, contentType });
    return { key, contentType, size: body.length };
  }
  async delete(key: string) { this.deletes.push(key); this.puts.delete(key); }
  publicUrl(key: string) { return `http://storage.test/${key}`; }
}

export class FakeImageProcessor implements ImageProcessorPort {
  constructor(private readonly meta: { width: number; height: number; mime: string } = { width: 1000, height: 800, mime: 'image/png' }) {}
  async metadata() { return this.meta; }
  async variants(_buffer: Buffer, specs: ImageVariantSpec[]): Promise<ProcessedVariant[]> {
    // Mirror sharp's `withoutEnlargement`: cap the output to the source dimensions so a
    // spec wider than the original (e.g. `large: 1600` on a 1000-wide source) does not
    // upscale — otherwise Asset.addVariant's no-upscale guard throws.
    return specs.map((s) => {
      const width = Math.min(s.width, this.meta.width);
      const height = Math.round((width / this.meta.width) * this.meta.height);
      return {
        label: s.label,
        buffer: Buffer.from(`variant-${s.label}`),
        width,
        height,
        mime: 'image/webp',
        size: 100,
      };
    });
  }
}

/** An image processor whose `metadata` rejects — simulates an unparseable buffer. */
export class UnparseableImageProcessor implements ImageProcessorPort {
  async metadata(): Promise<{ width: number; height: number; mime: string }> { throw new Error('not an image'); }
  async variants(): Promise<ProcessedVariant[]> { return []; }
}

export class InMemoryAssetRepository implements AssetRepositoryPort {
  byId = new Map<string, Asset>();
  async findById(id: AssetId) { return this.byId.get(id) ?? null; }
  async save(asset: Asset) { this.byId.set(asset.id, asset); }
  async update(asset: Asset) { this.byId.set(asset.id, asset); }
  async findByOwnerId(ownerId: UserId) { return [...this.byId.values()].filter((a) => a.ownerId === ownerId); }
}

export class FakeUnitOfWork implements UnitOfWorkPort<unknown> {
  private aggregates: EventCollector[] = [];
  dispatched: DomainEvent[] = [];
  collect(aggregate: EventCollector): void { this.aggregates.push(aggregate); }
  async run<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
    const result = await work(undefined);
    this.dispatched = this.aggregates.flatMap((a) => [...a.domainEvents]);
    for (const a of this.aggregates) a.clearDomainEvents();
    this.aggregates = [];
    return result;
  }
}
