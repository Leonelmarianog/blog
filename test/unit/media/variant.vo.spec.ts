import { Variant } from '@contexts/media/domain/asset/variant.vo';

const OK = { key: 'assets/x/medium.webp', label: 'medium' as const, mime: 'image/webp', size: 512, width: 800, height: 600 };

describe('Variant', () => {
  it('create succeeds for a valid variant', () => {
    const r = Variant.create(OK);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.label).toBe('medium');
    expect(r.value.width).toBe(800);
  });

  it('create fails for an unknown label', () => {
    expect(Variant.create({ ...OK, label: 'huge' as never }).ok).toBe(false);
  });

  it('create fails for non-positive size or dimensions', () => {
    expect(Variant.create({ ...OK, size: 0 }).ok).toBe(false);
    expect(Variant.create({ ...OK, width: 0 }).ok).toBe(false);
  });

  it('fromPersistence passes through without revalidation', () => {
    const v = Variant.fromPersistence({ key: 'k', label: 'thumbnail', mime: 'image/webp', size: -1, width: 0, height: 0 });
    expect(v.label).toBe('thumbnail');
  });
});
