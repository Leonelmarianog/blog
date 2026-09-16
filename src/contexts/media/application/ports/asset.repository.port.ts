import type { Asset } from '../../domain/asset/asset.aggregate';
import type { AssetId } from '../../domain/asset/asset.types';
import type { UserId } from '@contexts/iam/domain/user/user.types';

export const ASSET_REPOSITORY = Symbol('ASSET_REPOSITORY');

export interface AssetRepositoryPort<Tx = unknown> {
  findById(id: AssetId, tx?: Tx): Promise<Asset | null>;
  save(asset: Asset, tx?: Tx): Promise<void>;
  update(asset: Asset, tx?: Tx): Promise<void>;
  findByOwnerId(ownerId: UserId, tx?: Tx): Promise<Asset[]>;
}
