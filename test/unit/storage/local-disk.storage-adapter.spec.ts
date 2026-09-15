import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDiskStorageAdapter } from '@infra/storage/local-disk.storage-adapter';

describe('LocalDiskStorageAdapter', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'storage-')); });
  afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

  it('put writes the file under the root and returns the stored object', async () => {
    const adapter = new LocalDiskStorageAdapter({ root: dir, publicBase: '/storage' });
    const stored = await adapter.put('assets/a/original.png', Buffer.from('hi'), 'image/png');
    expect(stored.size).toBe(2);
    expect(readFileSync(join(dir, 'assets/a/original.png')).toString()).toBe('hi');
  });

  it('delete removes the file', async () => {
    const adapter = new LocalDiskStorageAdapter({ root: dir, publicBase: '/storage' });
    await adapter.put('assets/a/original.png', Buffer.from('hi'), 'image/png');
    await adapter.delete('assets/a/original.png');
    await expect(adapter.put('assets/a/original.png', Buffer.from('again'), 'image/png')).resolves.toBeDefined();
  });

  it('publicUrl joins the public base and key', () => {
    const adapter = new LocalDiskStorageAdapter({ root: dir, publicBase: '/storage' });
    expect(adapter.publicUrl('assets/a/original.png')).toBe('/storage/assets/a/original.png');
  });
});
