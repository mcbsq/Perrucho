-- Settings.id tenía DEFAULT 1 fijo (era un singleton antes de multi-tenant)
-- — cualquier negocio nuevo que intentara crear su propia fila de Settings
-- chocaba con la de Taylor's (unique constraint en id). Se reemplaza por una
-- secuencia real, arrancando después del id más alto existente para no
-- pisar filas actuales.
CREATE SEQUENCE IF NOT EXISTS "Settings_id_seq";
SELECT setval('"Settings_id_seq"', GREATEST((SELECT COALESCE(MAX(id), 0) FROM "Settings"), 1));
ALTER TABLE "Settings" ALTER COLUMN "id" SET DEFAULT nextval('"Settings_id_seq"');
ALTER SEQUENCE "Settings_id_seq" OWNED BY "Settings"."id";
