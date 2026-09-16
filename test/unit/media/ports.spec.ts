import { STORAGE, type StoragePort, type StoredObject } from '@contexts/media/application/ports/storage.port';
import { ASSET_REPOSITORY, type AssetRepositoryPort } from '@contexts/media/application/ports/asset.repository.port';
import { IMAGE_PROCESSOR, type ImageProcessorPort, type ProcessedVariant } from '@contexts/media/application/ports/image-processor.port';
import * as ports from '@contexts/media/application/ports';

describe('media application ports', () => {
  it('exports the storage port + symbol', () => {
    expect(typeof STORAGE).toBe('symbol');
    const _check: StoragePort = { async put() { return {} as StoredObject; }, async delete() {}, publicUrl() { return ''; }, async health() { return { ok: true }; } };
    expect(_check).toBeDefined();
  });

  it('exports the asset repository port + symbol', () => {
    expect(typeof ASSET_REPOSITORY).toBe('symbol');
    const _check: AssetRepositoryPort = { async findById() { return null; }, async save() {}, async update() {}, async findByOwnerId() { return []; } };
    expect(_check).toBeDefined();
  });

  it('exports the image processor port + symbol', () => {
    expect(typeof IMAGE_PROCESSOR).toBe('symbol');
    const _check: ImageProcessorPort = { async metadata() { return { width: 1, height: 1, mime: 'image/png' }; }, async variants() { return [] as ProcessedVariant[]; } };
    expect(_check).toBeDefined();
  });

  it('barrel re-exports all three symbols', () => {
    expect(ports.STORAGE).toBe(STORAGE);
    expect(ports.ASSET_REPOSITORY).toBe(ASSET_REPOSITORY);
    expect(ports.IMAGE_PROCESSOR).toBe(IMAGE_PROCESSOR);
  });
});
