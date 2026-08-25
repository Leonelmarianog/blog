import type { Identifier } from '@kernel/domain';

// Re-export Identifier so the committed boundary regression test
// (test/lint/boundaries.spec.ts) keeps resolving a real module at this path
// (it imports `Identifier` from here via both the @contexts alias and a relative path).
export type { Identifier };

export type UserId = Identifier<'User'>;