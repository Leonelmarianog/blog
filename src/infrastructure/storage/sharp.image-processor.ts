import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import type { ImageProcessorPort, ImageVariantSpec, ProcessedVariant } from '@contexts/media/application/ports/image-processor.port';

const MIME_BY_FORMAT: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

@Injectable()
export class SharpImageProcessor implements ImageProcessorPort {
  async metadata(buffer: Buffer): Promise<{ width: number; height: number; mime: string }> {
    const meta = await sharp(buffer).metadata();
    const mime = meta.format ? (MIME_BY_FORMAT[meta.format] ?? `image/${meta.format}`) : 'application/octet-stream';
    return { width: meta.width ?? 0, height: meta.height ?? 0, mime };
  }

  async variants(buffer: Buffer, specs: ImageVariantSpec[]): Promise<ProcessedVariant[]> {
    const out: ProcessedVariant[] = [];
    for (const spec of specs) {
      const { data, info } = await sharp(buffer)
        .resize({ width: spec.width, withoutEnlargement: true })
        .webp()
        .toBuffer({ resolveWithObject: true });
      out.push({
        label: spec.label,
        buffer: data,
        width: info.width,
        height: info.height,
        mime: 'image/webp',
        size: info.size,
      });
    }
    return out;
  }
}
