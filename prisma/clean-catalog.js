// prisma/clean-catalog.js
// Elimina todos los servicios y productos de prueba del seed.
// Ejecutar UNA SOLA VEZ antes de entregar la plataforma al cliente.
// El admin agregará sus propios servicios y productos desde el dashboard.
//
// Comando: node prisma/clean-catalog.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Limpiando catálogo de prueba...\n');

    // Eliminar extras de citas que referencian servicios
    const extrasDeleted = await prisma.appointmentExtra.deleteMany({});
    console.log(`  ✅ AppointmentExtras eliminados: ${extrasDeleted.count}`);

    // Eliminar items de ventas que referencian productos
    const saleItemsDeleted = await prisma.saleItem.deleteMany({});
    console.log(`  ✅ SaleItems eliminados: ${saleItemsDeleted.count}`);

    // Eliminar citas (referencian servicios)
    const apptsDeleted = await prisma.appointment.deleteMany({});
    console.log(`  ✅ Appointments eliminados: ${apptsDeleted.count}`);

    // Eliminar ventas
    const salesDeleted = await prisma.sale.deleteMany({});
    console.log(`  ✅ Sales eliminadas: ${salesDeleted.count}`);

    // Eliminar servicios
    const servicesDeleted = await prisma.service.deleteMany({});
    console.log(`  ✅ Servicios eliminados: ${servicesDeleted.count}`);

    // Eliminar productos
    const productsDeleted = await prisma.product.deleteMany({});
    console.log(`  ✅ Productos eliminados: ${productsDeleted.count}`);

    // Resetear secuencias para que los IDs empiecen desde 1
    const seqs = [
        '"Service_id_seq"',
        '"Product_id_seq"',
        '"Appointment_id_seq"',
        '"AppointmentExtra_id_seq"',
        '"Sale_id_seq"',
        '"SaleItem_id_seq"',
    ];
    for (const seq of seqs) {
        await prisma.$executeRawUnsafe(`SELECT setval('${seq}', 1, false)`);
    }
    console.log('  ✅ Secuencias reseteadas a 1');

    console.log('\n🎉 Listo. La plataforma está limpia.');
    console.log('   El admin puede ahora agregar sus propios servicios y productos.');
    console.log('\n   Cuentas activas:');
    console.log('   admin@mascotas.com     → administrador (password: 123456)');
    console.log('   empleado@mascotas.com  → empleado (password: 123456)');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());