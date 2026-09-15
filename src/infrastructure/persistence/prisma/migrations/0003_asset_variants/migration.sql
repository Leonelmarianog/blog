CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "originalMime" TEXT NOT NULL,
    "originalSize" INTEGER NOT NULL,
    "originalWidth" INTEGER NOT NULL,
    "originalHeight" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Asset_ownerId_idx" ON "Asset"("ownerId");
CREATE TABLE "AssetVariant" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    CONSTRAINT "AssetVariant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssetVariant_assetId_label_key" UNIQUE ("assetId", "label")
);
CREATE INDEX "AssetVariant_assetId_idx" ON "AssetVariant"("assetId");
ALTER TABLE "AssetVariant" ADD CONSTRAINT "AssetVariant_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;