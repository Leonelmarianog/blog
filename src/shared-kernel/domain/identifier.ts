import { randomUUID } from 'node:crypto';

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type Identifier<B extends string> = Brand<string, B>;

export const Identifier = {
  generate<B extends string>(): Identifier<B> {
    return randomUUID() as Identifier<B>;
  },
  from<B extends string>(value: string): Identifier<B> {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(
        `Invalid identifier: expected a non-empty string, received "${value}"`,
      );
    }
    return value as Identifier<B>;
  },
  equals<B extends string>(a: Identifier<B>, b: Identifier<B>): boolean {
    return a === b;
  },
};
