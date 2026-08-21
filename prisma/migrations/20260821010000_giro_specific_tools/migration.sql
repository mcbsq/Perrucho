-- Herramientas específicas por giro (ver docs/superpowers/specs/2026-08-21-herramientas-por-giro-design.md).
-- Todo default seguro (false / null) — ningún negocio existente (incluido
-- Taylor's) cambia de comportamiento hasta que se prenda explícitamente.

-- AlterTable: Settings — 4 flags nuevos, todos apagados por default.
ALTER TABLE "Settings"
  ADD COLUMN "enableStaffSelection" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enableMemberships" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enableClientNotes" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "enableTableReservations" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Service — marca de "es una clase" (giro gimnasio).
ALTER TABLE "Service"
  ADD COLUMN "isClass" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: User — expediente clínico (giro clínica) y membresía actual
-- (giro gimnasio), ambos sin tabla de historial aparte.
ALTER TABLE "User"
  ADD COLUMN "clinicalHistory" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "membershipPlanId" INTEGER,
  ADD COLUMN "membershipExpiresAt" TIMESTAMP(3),
  ADD COLUMN "membershipClassesUsed" INTEGER;

-- CreateTable: MembershipPlan — catálogo de planes de membresía (giro gimnasio).
CREATE TABLE "MembershipPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "classesLimit" INTEGER,
    "businessId" INTEGER,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_membershipPlanId_fkey"
  FOREIGN KEY ("membershipPlanId") REFERENCES "MembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
