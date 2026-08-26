ALTER TABLE "User" ADD COLUMN "displayName" TEXT NOT NULL DEFAULT 'User';
-- Backfill any nulls and drop the default so new rows must supply displayName.
UPDATE "User" SET "displayName" = 'User' WHERE "displayName" IS NULL;
ALTER TABLE "User" ALTER COLUMN "displayName" DROP DEFAULT;
