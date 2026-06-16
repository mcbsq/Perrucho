-- CreateEnum
CREATE TYPE "Role" AS ENUM ('administrador', 'empleado', 'cliente');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Pendiente', 'Confirmada', 'EnProceso', 'Completada', 'Cancelada');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('efectivo', 'tarjeta', 'transferencia');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('pagado', 'pendiente');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('service', 'product', 'mixed');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'cliente',
    "phone" TEXT,
    "address" TEXT,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" SERIAL NOT NULL,
    "petName" TEXT NOT NULL,
    "species" TEXT NOT NULL DEFAULT 'perro',
    "breed" TEXT,
    "weight" TEXT,
    "notes" TEXT,
    "history" JSONB NOT NULL DEFAULT '[]',
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🐾',
    "color" TEXT NOT NULL DEFAULT 'blue',
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "priceMini" INTEGER NOT NULL DEFAULT 0,
    "priceChico" INTEGER NOT NULL DEFAULT 0,
    "priceMediano" INTEGER NOT NULL DEFAULT 0,
    "priceGrande" INTEGER NOT NULL DEFAULT 0,
    "priceExtra" INTEGER NOT NULL DEFAULT 0,
    "priceJumbo" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "employeeId" INTEGER,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'Pendiente',
    "finalPrice" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentExtra" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AppointmentExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER,
    "employeeId" INTEGER,
    "appointmentId" INTEGER,
    "total" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'efectivo',
    "status" "SaleStatus" NOT NULL DEFAULT 'pendiente',
    "type" "SaleType" NOT NULL DEFAULT 'service',
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" SERIAL NOT NULL,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "allowGuestBooking" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNumber" TEXT NOT NULL DEFAULT '5633252525',
    "businessAddress" TEXT NOT NULL DEFAULT 'Montevideo No. 157, Col. Lindavista, GAM, CDMX',
    "businessMapsUrl" TEXT NOT NULL DEFAULT 'https://maps.app.goo.gl/HNpfNETNeUqptAbK6',
    "instagramUrl" TEXT NOT NULL DEFAULT 'https://www.instagram.com/taylors.petservices.mx',
    "facebookUrl" TEXT NOT NULL DEFAULT 'https://www.facebook.com/share/1LixCZxfux/',
    "tiktokUrl" TEXT NOT NULL DEFAULT 'https://www.tiktok.com/@taylors.pet.services',

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_appointmentId_key" ON "Sale"("appointmentId");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentExtra" ADD CONSTRAINT "AppointmentExtra_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentExtra" ADD CONSTRAINT "AppointmentExtra_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
