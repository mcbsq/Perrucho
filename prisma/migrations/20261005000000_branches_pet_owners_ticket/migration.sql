-- Sucursales, mascotas con varios dueños y formato de ticket por negocio.
-- Todo es aditivo: ninguna columna existente cambia de tipo ni se borra.

-- ── Sucursales ──────────────────────────────────────────────────────────────
CREATE TABLE "Branch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "mapsUrl" TEXT NOT NULL DEFAULT '',
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" ADD COLUMN "branchId" INTEGER;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale" ADD COLUMN "branchId" INTEGER;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cada negocio arranca con su sucursal principal, armada con la dirección
-- y el WhatsApp que ya tenía en Personalización — así nada se ve vacío.
INSERT INTO "Branch" ("name", "address", "phone", "mapsUrl", "isMain", "businessId")
SELECT 'Sucursal principal', COALESCE(s."businessAddress", ''), COALESCE(s."whatsappNumber", ''),
       COALESCE(s."businessMapsUrl", ''), true, b."id"
FROM "Business" b
LEFT JOIN LATERAL (
    SELECT * FROM "Settings" st WHERE st."businessId" = b."id" ORDER BY st."id" LIMIT 1
) s ON true;

-- ── Mascotas ↔ dueños (muchos a muchos) ─────────────────────────────────────
CREATE TABLE "PetOwner" (
    "petId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PetOwner_pkey" PRIMARY KEY ("petId", "userId")
);
CREATE INDEX "PetOwner_userId_idx" ON "PetOwner"("userId");
ALTER TABLE "PetOwner" ADD CONSTRAINT "PetOwner_petId_fkey"
    FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PetOwner" ADD CONSTRAINT "PetOwner_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El dueño actual de cada mascota pasa a ser su primer dueño en la tabla.
INSERT INTO "PetOwner" ("petId", "userId")
SELECT "id", "ownerId" FROM "Pet"
ON CONFLICT DO NOTHING;

-- ── Ticket de venta ─────────────────────────────────────────────────────────
ALTER TABLE "Settings" ADD COLUMN "ticketConfig" JSONB NOT NULL DEFAULT '{}';
