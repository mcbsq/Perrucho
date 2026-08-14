-- Additive-only migration (no drops, no changes to existing tables) — safe
-- to run against the shared production database. Introduces the Business
-- table used for multi-tenancy; nothing references it yet, so this cannot
-- break Taylor's current single-tenant behavior.
CREATE TABLE "Business" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "giro" TEXT NOT NULL DEFAULT 'mascotas',
    "aegisTenantId" TEXT,
    "authProvider" TEXT NOT NULL DEFAULT 'local',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- Business #1 = Taylor's, la única empresa que existe hoy. Su id (esperado 1,
-- por ser la primera fila de una tabla nueva) se usará en la migración de
-- Fase 1 para el backfill de businessId en el resto de las tablas.
INSERT INTO "Business" ("slug", "name", "giro", "authProvider")
VALUES ('taylors', 'Taylor''s Pet Services', 'mascotas', 'local');
