import type { Identifier } from '@kernel/domain';

export type TokenId = Identifier<'Token'>;
export type TokenType = 'VERIFICATION' | 'RESET';
