// Re-export the generated Prisma client + Prisma namespace from one stable path
// so the rest of the persistence layer imports from './client', not the
// gitignored './generated/client' directly.
export * from './generated/client';
