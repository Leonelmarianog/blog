import { ValueObject } from '@kernel/domain';
import { DomainError, fail, ok, type Result } from '@kernel/domain';

const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AssetMime = (typeof ALLOWED_MIMES)[number];

export interface OriginalFileProps {
  key: string;
  mime: string;
  size: number;
  width: number;
  height: number;
}

export class OriginalFile extends ValueObject<OriginalFileProps> {
  private constructor(props: OriginalFileProps) {
    super(props);
  }

  get key(): string { return this.props.key; }
  get mime(): string { return this.props.mime; }
  get size(): number { return this.props.size; }
  get width(): number { return this.props.width; }
  get height(): number { return this.props.height; }

  static create(props: OriginalFileProps): Result<OriginalFile, DomainError> {
    if (!props.key) return fail(new DomainError('original key must not be empty'));
    if (!(ALLOWED_MIMES as readonly string[]).includes(props.mime))
      return fail(new DomainError(`Unsupported mime type: "${props.mime}"`));
    if (props.size <= 0) return fail(new DomainError('size must be positive'));
    if (props.width <= 0 || props.height <= 0) return fail(new DomainError('dimensions must be positive'));
    return ok(new OriginalFile(props));
  }

  static fromPersistence(props: OriginalFileProps): OriginalFile {
    return new OriginalFile(props);
  }
}
