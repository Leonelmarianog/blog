import { ValueObject } from '@kernel/domain';
import { DomainError, fail, ok, type Result } from '@kernel/domain';

export type VariantLabel = 'thumbnail' | 'medium' | 'large';
const LABELS: readonly VariantLabel[] = ['thumbnail', 'medium', 'large'];

export interface VariantProps {
  key: string;
  label: VariantLabel;
  mime: string;
  size: number;
  width: number;
  height: number;
}

export class Variant extends ValueObject<VariantProps> {
  private constructor(props: VariantProps) {
    super(props);
  }

  get key(): string { return this.props.key; }
  get label(): VariantLabel { return this.props.label; }
  get mime(): string { return this.props.mime; }
  get size(): number { return this.props.size; }
  get width(): number { return this.props.width; }
  get height(): number { return this.props.height; }

  static create(props: VariantProps): Result<Variant, DomainError> {
    if (!(LABELS as readonly string[]).includes(props.label))
      return fail(new DomainError(`Unknown variant label: "${props.label}"`));
    if (!props.key) return fail(new DomainError('variant key must not be empty'));
    if (props.size <= 0) return fail(new DomainError('variant size must be positive'));
    if (props.width <= 0 || props.height <= 0) return fail(new DomainError('variant dimensions must be positive'));
    return ok(new Variant(props));
  }

  static fromPersistence(props: VariantProps): Variant {
    return new Variant(props);
  }
}
