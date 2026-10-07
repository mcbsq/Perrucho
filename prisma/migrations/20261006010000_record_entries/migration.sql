-- Expediente por visita/consulta (de servicio o médico) con fotos/videos,
-- y antecedentes por paciente. Aditiva: no cambia ni borra nada existente.
CREATE TABLE "RecordEntry" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'servicio',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "petId" INTEGER,
    "clientId" INTEGER,
    "appointmentId" INTEGER,
    "serviceId" INTEGER,
    "serviceName" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "details" JSONB NOT NULL DEFAULT '{}',
    "media" JSONB NOT NULL DEFAULT '[]',
    "authorId" INTEGER,
    "authorName" TEXT,
    "businessId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecordEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RecordEntry_petId_date_idx" ON "RecordEntry"("petId", "date");
CREATE INDEX "RecordEntry_clientId_date_idx" ON "RecordEntry"("clientId", "date");
ALTER TABLE "RecordEntry" ADD CONSTRAINT "RecordEntry_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecordEntry" ADD CONSTRAINT "RecordEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecordEntry" ADD CONSTRAINT "RecordEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecordEntry" ADD CONSTRAINT "RecordEntry_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Pet" ADD COLUMN "medicalProfile" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "medicalProfile" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Settings" ADD COLUMN "recordMode" TEXT NOT NULL DEFAULT 'auto';

-- Historiales previos (texto en Pet.history / User.clinicalHistory) pasan a
-- ser entradas del expediente, para que nada se pierda al cambiar de vista.
INSERT INTO "RecordEntry" ("kind", "date", "petId", "summary", "authorName", "businessId")
SELECT 'servicio',
       CASE WHEN h->>'date' ~ '^\d{4}-\d{2}-\d{2}' THEN to_timestamp(substr(h->>'date', 1, 10), 'YYYY-MM-DD') + interval '18 hours'
            WHEN h->>'date' ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN to_timestamp(h->>'date', 'DD/MM/YYYY') + interval '18 hours'
            ELSE p."createdAt" END,
       p."id", COALESCE(h->>'detail', ''), h->>'author', p."businessId"
FROM "Pet" p, jsonb_array_elements(p."history") h
WHERE jsonb_typeof(p."history") = 'array';

INSERT INTO "RecordEntry" ("kind", "date", "clientId", "appointmentId", "summary", "authorName", "businessId")
SELECT 'medico',
       CASE WHEN h->>'date' ~ '^\d{4}-\d{2}-\d{2}' THEN to_timestamp(substr(h->>'date', 1, 10), 'YYYY-MM-DD') + interval '18 hours'
            ELSE u."createdAt" END,
       u."id", CASE WHEN h->>'appointmentId' ~ '^\d+$' THEN (h->>'appointmentId')::int END, COALESCE(h->>'note', ''), h->>'authorName', u."businessId"
FROM "User" u, jsonb_array_elements(u."clinicalHistory") h
WHERE jsonb_typeof(u."clinicalHistory") = 'array';
