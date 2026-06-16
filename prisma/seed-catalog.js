// prisma/seed-catalog.js
// Siembra los servicios reales del catálogo de Taylor's Pet Services
// según el PDF "Catálogo de servicios 2026"
// Comando: node prisma/seed-catalog.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Sembrando catálogo real de Taylor\'s Pet Services...\n');

    const servicios = [
        // ── GROOMING BÁSICO ───────────────────────────────────────────────────
        {
            title:       'Grooming básico pelo corto',
            description: 'Shampoo neutro especial para mascotas, cepillado preventivo, corte higiénico, limpieza superficial de oídos, talco ótico, corte en cojinetes, corte de uñas, limpieza dental y humectación de patitas. Perfume y adorno opcional.',
            category:    'Grooming',
            icon:        '✂️',
            color:       'blue',
            popular:     false,
            priceMini:    180,
            priceChico:   220,
            priceMediano: 280,
            priceGrande:  350,
            priceExtra:   460,
            priceJumbo:   600,
            price:        180,
        },
        {
            title:       'Grooming básico pelo largo',
            description: 'Shampoo neutro especial para mascotas, cepillado preventivo, corte higiénico, limpieza superficial de oídos, talco ótico, corte en cojinetes, corte de uñas, limpieza dental y humectación de patitas. Perfume y adorno opcional.',
            category:    'Grooming',
            icon:        '✂️',
            color:       'lavender',
            popular:     true,
            priceMini:    200,
            priceChico:   250,
            priceMediano: 320,
            priceGrande:  410,
            priceExtra:   540,
            priceJumbo:   700,
            price:        200,
        },
        {
            title:       'Baño y corte',
            description: 'Shampoo neutro especial para mascotas, cepillado preventivo, corte higiénico, limpieza superficial de oídos, talco ótico, corte en cojinetes, corte de uñas, limpieza dental y humectación de patitas. Perfume y adorno opcional.',
            category:    'Grooming',
            icon:        '🛁',
            color:       'blue',
            popular:     true,
            priceMini:    230,
            priceChico:   290,
            priceMediano: 360,
            priceGrande:  460,
            priceExtra:   580,
            priceJumbo:   750,
            price:        230,
        },
        {
            title:       'Servicio premium (shampoo de especialidad)',
            description: 'Complemento al grooming básico o baño y corte. Escoge entre shampoos de especialidad: desmugrante, purificante, avena y miel, keratina, hidratante. Pregunta por los tratamientos disponibles en sucursal.',
            category:    'Grooming',
            icon:        '⭐',
            color:       'lavender',
            popular:     false,
            priceMini:    20,
            priceChico:   20,
            priceMediano: 30,
            priceGrande:  30,
            priceExtra:   40,
            priceJumbo:   40,
            price:        20,
        },

        // ── SERVICIOS ADICIONALES ─────────────────────────────────────────────
        {
            title:       'Baño antipulgas',
            description: 'Baño con shampoo especializado antipulgas. A consideración del estilista y del cliente.',
            category:    'Servicios adicionales',
            icon:        '🛁',
            color:       'mint',
            popular:     false,
            priceMini:    30,
            priceChico:   40,
            priceMediano: 50,
            priceGrande:  60,
            priceExtra:   70,
            priceJumbo:   80,
            price:        30,
        },
        {
            title:       'Baño antiseborreico',
            description: 'Baño con shampoo especializado antiseborreico. A consideración del estilista y del cliente.',
            category:    'Servicios adicionales',
            icon:        '🛁',
            color:       'mint',
            popular:     false,
            priceMini:    30,
            priceChico:   40,
            priceMediano: 50,
            priceGrande:  60,
            priceExtra:   70,
            priceJumbo:   80,
            price:        30,
        },
        {
            title:       'Desenredado (1 hr)',
            description: 'Servicio de desenredado por hora. A consideración del estilista y del cliente.',
            category:    'Servicios adicionales',
            icon:        '🐾',
            color:       'blue',
            popular:     false,
            priceMini:    80,
            priceChico:   100,
            priceMediano: 120,
            priceGrande:  140,
            priceExtra:   160,
            priceJumbo:   180,
            price:        80,
        },
        {
            title:       'Deslanado / muda de pelo (1 hr)',
            description: 'Servicio de deslanado y muda de pelo por hora. A consideración del estilista y del cliente.',
            category:    'Servicios adicionales',
            icon:        '🐾',
            color:       'blue',
            popular:     false,
            priceMini:    60,
            priceChico:   80,
            priceMediano: 100,
            priceGrande:  120,
            priceExtra:   140,
            priceJumbo:   160,
            price:        60,
        },
        {
            title:       'Corte de uñas (único servicio)',
            description: 'Corte y limado de uñas como servicio único.',
            category:    'Servicios adicionales',
            icon:        '🐾',
            color:       'mint',
            popular:     false,
            priceMini:    25,
            priceChico:   25,
            priceMediano: 30,
            priceGrande:  30,
            priceExtra:   40,
            priceJumbo:   40,
            price:        25,
        },
    ];

    for (const s of servicios) {
        const existing = await prisma.service.findFirst({ where: { title: s.title } });
        if (existing) {
            await prisma.service.update({ where: { id: existing.id }, data: s });
        } else {
            await prisma.service.create({ data: s });
        }
        console.log(`  ✅ ${s.title}`);
    }

    // Resetear secuencia
    await prisma.$executeRawUnsafe(`SELECT setval('"Service_id_seq"', (SELECT MAX(id) FROM "Service") + 1, false)`);

    console.log('\n🎉 Catálogo sembrado exitosamente.');
    console.log('   9 servicios reales de Taylor\'s Pet Services agregados.');
    console.log('\n   Rangos de peso:');
    console.log('   Mini    1–5 kg   · Chico   6–9 kg');
    console.log('   Mediano 10–19 kg · Grande  20–34 kg');
    console.log('   Extra   35–44 kg · Jumbo   45+ kg');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());