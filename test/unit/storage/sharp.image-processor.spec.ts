import sharp from 'sharp';
import { SharpImageProcessor } from '@infra/storage/sharp.image-processor';

async function pngBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 0, g: 0, b: 0 } } }).png().toBuffer();
}

describe('SharpImageProcessor', () => {
  const processor = new SharpImageProcessor();

  it('metadata reads width/height/mime from a real PNG', async () => {
    const meta = await processor.metadata(await pngBuffer(400, 300));
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
    expect(meta.mime).toBe('image/png');
  });

  it('variants produces one webp per spec, never wider than the spec, never upscaled', async () => {
    const rendered = await processor.variants(await pngBuffer(1000, 800), [
      { label: 'thumbnail', width: 300 },
      { label: 'large', width: 1600 },
    ]);
    expect(rendered).toHaveLength(2);
    expect(rendered.every((v) => v.mime === 'image/webp')).toBe(true);
    const thumb = rendered.find((v) => v.label === 'thumbnail')!;
    expect(thumb.width).toBeLessThanOrEqual(300);
    const large = rendered.find((v) => v.label === 'large')!;
    expect(large.width).toBeLessThanOrEqual(1000); // withoutEnlargement: no upscale
    expect(large.width).toBeGreaterThan(0);
  });
});
