import type { ImageVariantSpec } from '../ports/image-processor.port';

export const VARIANT_SPECS: readonly ImageVariantSpec[] = [
  { label: 'thumbnail', width: 300 },
  { label: 'medium', width: 800 },
  { label: 'large', width: 1600 },
];
