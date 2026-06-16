// prisma/reset-sequences.js
// Ejecutar UNA SOLA VEZ después del seed inicial.
// Problema: el seed sembró usuarios con IDs manuales (1, 2, 101, 102, 103).
// PostgreSQL no actualiza la secuencia de autoincrement automáticamente,
// así que cuando se intenta crear un nuevo usuario, intenta usar ID 1 → ya existe → error P2002.
// Este script resetea todas las secuencias al valor máximo actual + 1.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetSequences() {
    console.log('🔧 Reseteando secuencias de autoincrement...');

    const tables = [
        { seq: '"User_id_seq"',             table: '"User"' },
        { seq: '"Pet_id_seq"',              table: '"Pet"' },
        { seq: '"Service_id_seq"',          table: '"Service"' },
        { seq: '"Product_id_seq"',          table: '"Product"' },
        { seq: '"Appointment_id_seq"',      table: '"Appointment"' },
        { seq: '"AppointmentExtra_id_seq"', table: '"AppointmentExtra"' },
        { seq: '"Sale_id_seq"',             table: '"Sale"' },
        { seq: '"SaleItem_id_seq"',         table: '"SaleItem"' },
    ];

    for (const { seq, table } of tables) {
        try {
            await prisma.$executeRawUnsafe(
                `SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`
            );
            console.log(`  ✅ ${seq} reseteada`);
        } catch (err) {
            console.warn(`  ⚠️  ${seq}: ${err.message}`);
        }
    }

    console.log('\n🎉 Secuencias reseteadas. Ahora puedes crear nuevos registros sin conflictos.');
}

resetSequences()
    .catch(console.error)
    .finally(() => prisma.$disconnect());