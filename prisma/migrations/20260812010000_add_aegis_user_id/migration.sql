-- Additive/loosening migration (no data loss) — safe against production.
-- password pasa a nullable: los negocios que migren a AEGIS (authProvider
-- "aegis") no vuelven a escribir un hash local; los que sigan en "local"
-- (Taylor's, por ahora) no se ven afectados, sus filas ya tienen password.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN "aegisUserId" TEXT;
CREATE UNIQUE INDEX "User_aegisUserId_key" ON "User"("aegisUserId");
