-- Agrega horarios de atención por negocio y duración real por servicio.
-- Ambas columnas traen default, así que las filas existentes (incluida
-- Taylor's) quedan con el mismo comportamiento efectivo que tenían antes.
ALTER TABLE "Service" ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 45;

ALTER TABLE "Settings" ADD COLUMN "businessHours" JSONB NOT NULL DEFAULT '[{"day":0,"open":true,"start":"10:15","end":"17:00"},{"day":1,"open":true,"start":"10:15","end":"17:00"},{"day":2,"open":true,"start":"10:15","end":"17:00"},{"day":3,"open":true,"start":"10:15","end":"17:00"},{"day":4,"open":true,"start":"10:15","end":"17:00"},{"day":5,"open":true,"start":"10:15","end":"17:00"},{"day":6,"open":true,"start":"10:15","end":"17:00"}]';
