export const TOKEN_HASHER = Symbol('TOKEN_HASHER');

export interface TokenHasherPort {
  hash(value: string): string;
  verify(value: string, hash: string): boolean;
}
