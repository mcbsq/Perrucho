-- Cuentas por cobrar: una venta pendiente ya no lleva método de pago (se
-- registra al cobrarla) y guarda cuándo se pagó y cuándo se le recordó.
-- Aditivo: ninguna venta existente cambia.
ALTER TABLE "Sale" ALTER COLUMN "paymentMethod" DROP NOT NULL;
ALTER TABLE "Sale" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
