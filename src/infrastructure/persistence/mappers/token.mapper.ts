import { Identifier } from '@kernel/domain';
import { Token } from '@contexts/iam/domain/token/token.entity';
import type { TokenProps } from '@contexts/iam/domain/token/token.entity';
import type { TokenType } from '@contexts/iam/domain/token/token.types';
import type { Prisma } from '../prisma/client';

type TokenRow = Prisma.TokenGetPayload<{}>;

export const TokenMapper = {
  toPersistence(token: Token): Prisma.TokenUncheckedCreateInput {
    return {
      id: token.id,
      type: token.type,
      selector: token.selector,
      verifierHash: token.verifierHash,
      userId: token.userId,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
    };
  },

  toDomain(row: TokenRow): Token {
    const props: TokenProps = {
      id: Identifier.from<'Token'>(row.id),
      type: row.type as TokenType,
      selector: row.selector,
      verifierHash: row.verifierHash,
      userId: Identifier.from<'User'>(row.userId),
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
    };
    return Token.fromPersistence(props);
  },
};
