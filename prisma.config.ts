// Prisma 7 moved the datasource connection URL out of `schema.prisma` and into
// this config file. The CLI loads it for every command (generate, migrate, ...).
// `import "dotenv/config"` populates `process.env` from `.env` so local CLI
// commands see `DATABASE_URL` without the caller having to source the file.
// The fallback to `""` keeps `prisma generate` (and `postinstall`) working in
// CI / fresh clones where no database is configured yet.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/infrastructure/persistence/prisma/schema.prisma',
  migrations: {
    path: 'src/infrastructure/persistence/prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});