-- Bug real reportado por el cliente: borrar un paciente (o cliente/servicio/
-- empleado/producto) con historial asociado tronaba con "Error del
-- servidor" — Postgres bloqueaba el DELETE por la relación (RESTRICT, el
-- default de Prisma cuando no se especifica onDelete). Cambia esas
-- referencias a SET NULL: la cita/venta sobrevive, solo pierde esa
-- referencia puntual, en vez de bloquear el borrado por completo.
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_clientId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_petId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_petId_fkey"
  FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_serviceId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey"
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_employeeId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Sale" DROP CONSTRAINT "Sale_clientId_fkey";
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_productId_fkey";
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
