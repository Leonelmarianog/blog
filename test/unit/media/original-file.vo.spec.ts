import { OriginalFile } from '@contexts/media/domain/asset/original-file.vo';

const OK = { key: 'assets/x/original.png', mime: 'image/png', size: 1024, width: 100, height: 100 };

describe('OriginalFile', () => {
  it('create succeeds for a valid image file', () => {
    const r = OriginalFile.create(OK);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.key).toBe(OK.key);
    expect(r.value.mime).toBe('image/png');
    expect(r.value.width).toBe(100);
  });

  it('create fails for an unsupported mime', () => {
    expect(OriginalFile.create({ ...OK, mime: 'image/gif' }).ok).toBe(false);
  });

  it('create fails for non-positive size or dimensions', () => {
    expect(OriginalFile.create({ ...OK, size: 0 }).ok).toBe(false);
    expect(OriginalFile.create({ ...OK, width: 0 }).ok).toBe(false);
    expect(OriginalFile.create({ ...OK, height: -1 }).ok).toBe(false);
  });

  it('create fails for an empty key', () => {
    expect(OriginalFile.create({ ...OK, key: '' }).ok).toBe(false);
  });

  it('fromPersistence passes through without revalidation', () => {
    const f = OriginalFile.fromPersistence({ key: 'k', mime: 'image/gif', size: -1, width: 0, height: 0 });
    expect(f.mime).toBe('image/gif');
  });
});
