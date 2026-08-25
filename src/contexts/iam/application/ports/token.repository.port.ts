import type { Token } from '../../domain/token/token.entity';

export interface TokenRepositoryPort<Tx = unknown> {
  findBySelector(selector: string, tx?: Tx): Promise<Token | null>;
  save(token: Token, tx?: Tx): Promise<void>;
  update(token: Token, tx?: Tx): Promise<void>;
}
