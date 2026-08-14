-- Fase 1, pasos 1+2 (additive-only, safe against production): agrega
-- businessId NULLABLE a cada tabla que necesita aislamiento multi-tenant, y
-- respalda cada fila existente a Business #1 (Taylor's, slug 'taylors').
-- NO se agrega NOT NULL, FK ni índice todavía — eso es un paso posterior,
-- una vez que el código de Fase 2 escriba businessId en cada insert nuevo
-- (mezclar ambos pasos en el mismo deploy podría romper un insert que
-- todavía no envíe la columna).

ALTER TABLE "User" ADD COLUMN "businessId" INTEGER;
ALTER TABLE "Pet" ADD COLUMN "businessId" INTEGER;
ALTER TABLE "Service" ADD COLUMN "businessId" INTEGER;
ALTER TABLE "Product" ADD COLUMN "businessId" INTEGER;
ALTER TABLE "Appointment" ADD COLUMN "businessId" INTEGER;
ALTER TABLE "Expense" ADD COLUMN "businessId" INTEGER;
ALTER TABLE "Sale" ADD COLUMN "businessId" INTEGER;
ALTER TABLE "Settings" ADD COLUMN "businessId" INTEGER;

UPDATE "User" SET "businessId" = 1 WHERE "businessId" IS NULL;
UPDATE "Pet" SET "businessId" = 1 WHERE "businessId" IS NULL;
UPDATE "Service" SET "businessId" = 1 WHERE "businessId" IS NULL;
UPDATE "Product" SET "businessId" = 1 WHERE "businessId" IS NULL;
UPDATE "Appointment" SET "businessId" = 1 WHERE "businessId" IS NULL;
UPDATE "Expense" SET "businessId" = 1 WHERE "businessId" IS NULL;
UPDATE "Sale" SET "businessId" = 1 WHERE "businessId" IS NULL;
UPDATE "Settings" SET "businessId" = 1 WHERE "businessId" IS NULL;
