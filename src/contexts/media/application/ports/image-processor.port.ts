import type { VariantLabel } from '../../domain/asset/variant.vo';

export const IMAGE_PROCESSOR = Symbol('IMAGE_PROCESSOR');

export interface ImageVariantSpec {
  label: VariantLabel;
  width: number;
}

export interface ProcessedVariant {
  label: VariantLabel;
  buffer: Buffer;
  width: number;
  height: number;
  mime: string;
  size: number;
}

export interface ImageProcessorPort {
  metadata(buffer: Buffer): Promise<{ width: number; height: number; mime: string }>;
  variants(buffer: Buffer, specs: ImageVariantSpec[]): Promise<ProcessedVariant[]>;
}
