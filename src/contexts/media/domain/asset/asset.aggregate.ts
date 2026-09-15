import { AggregateRoot, Identifier } from '@kernel/domain';
import type { UserId } from '@contexts/iam/domain/user/user.types';
import type { OriginalFile } from './original-file.vo';
import type { Variant } from './variant.vo';
import type { AssetId } from './asset.types';
import { AssetUploaded, AssetVariantAdded } from '../events/asset-events';

export interface AssetUploadInput {
  ownerId: UserId;
  original: OriginalFile;
}

export interface AssetPersistenceProps {
  id: AssetId;
  ownerId: UserId;
  original: OriginalFile;
  variants: Variant[];
  createdAt: Date;
  updatedAt: Date;
}

export class Asset extends AggregateRoot<'Asset'> {
  private readonly _ownerId: UserId;
  private readonly _original: OriginalFile;
  private readonly _variants: Variant[] = [];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AssetPersistenceProps) {
    super(props.id);
    this._ownerId = props.ownerId;
    this._original = props.original;
    this._variants = [...props.variants];
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  static upload(input: AssetUploadInput): Asset {
    const now = new Date();
    const asset = new Asset({
      id: Identifier.generate<'Asset'>(),
      ownerId: input.ownerId,
      original: input.original,
      variants: [],
      createdAt: now,
      updatedAt: now,
    });
    asset.addDomainEvent(new AssetUploaded(asset.id));
    return asset;
  }

  static fromPersistence(props: AssetPersistenceProps): Asset {
    return new Asset(props);
  }

  get ownerId(): UserId { return this._ownerId; }
  get original(): OriginalFile { return this._original; }
  get variants(): readonly Variant[] { return this._variants; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  addVariant(variant: Variant): void {
    if (this._variants.some((v) => v.label === variant.label))
      throw new Error(`Duplicate variant label: "${variant.label}"`);
    if (variant.width > this._original.width || variant.height > this._original.height)
      throw new Error(`Variant "${variant.label}" would upscale the original`);
    this._variants.push(variant);
    this._updatedAt = new Date();
    this.addDomainEvent(new AssetVariantAdded(this.id));
  }
}
