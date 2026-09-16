import { DomainEvent } from '@kernel/domain';
import type { AssetId } from '../asset/asset.types';

export class AssetUploaded extends DomainEvent {
  constructor(assetId: AssetId) {
    super(assetId);
  }
}

export class AssetVariantAdded extends DomainEvent {
  constructor(assetId: AssetId) {
    super(assetId);
  }
}
