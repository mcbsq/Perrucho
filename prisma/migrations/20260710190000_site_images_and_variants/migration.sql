-- Additive-only migration (no drops) — safe to run against the shared
-- production database while the deployed site still uses the old schema.
ALTER TABLE "Service" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "variants" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Settings" ADD COLUMN "heroImageUrl" TEXT;
ALTER TABLE "Settings" ADD COLUMN "loginBackgroundUrl" TEXT;
