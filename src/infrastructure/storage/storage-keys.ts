import type { VariantLabel } from '@contexts/media/domain/asset/variant.vo';
import type { AssetId } from '@contexts/media/domain/asset/asset.types';

export function originalKey(assetId: AssetId, ext: string): string {
  return `assets/${assetId}/original.${ext}`;
}

export function variantKey(assetId: AssetId, label: VariantLabel, ext: string): string {
  return `assets/${assetId}/${label}.${ext}`;
}
