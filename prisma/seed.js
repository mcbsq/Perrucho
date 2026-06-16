// prisma/seed.js
// Siembra los datos iniciales de Perrucho en PostgreSQL.
// Idempotente: se puede correr múltiples veces sin duplicar datos.
// Comando: npx prisma db seed

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de Perrucho...');

  // ── 1. SETTINGS ────────────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      allowGuestBooking: true,
      whatsappNumber: '5633252525',
      businessAddress: 'Montevideo No. 157, Col. Lindavista, GAM, CDMX',
      businessMapsUrl: 'https://maps.app.goo.gl/HNpfNETNeUqptAbK6',
      instagramUrl: 'https://www.instagram.com/taylors.petservices.mx',
      facebookUrl: 'https://www.facebook.com/share/1LixCZxfux/',
      tiktokUrl: 'https://www.tiktok.com/@taylors.pet.services',
    },
  });
  console.log('✅ Settings creados');

  // ── 2. USERS (incluye clientes unificados) ─────────────────────────────────
  const passwordHash = await bcrypt.hash('123456', 10);

  const usersData = [
    {
      id: 1,
      name: 'Administrador',
      email: 'admin@mascotas.com',
      password: passwordHash,
      role: 'administrador',
      phone: null,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 2,
      name: 'Empleado',
      email: 'empleado@mascotas.com',
      password: passwordHash,
      role: 'empleado',
      phone: null,
      capacity: 1,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 101,
      name: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      password: passwordHash,
      role: 'cliente',
      phone: '228 123 4567',
      createdAt: new Date('2026-01-12'),
    },
    {
      id: 102,
      name: 'María García',
      email: 'maria@ejemplo.com',
      password: passwordHash,
      role: 'cliente',
      phone: '228 987 6543',
      createdAt: new Date('2026-01-12'),
    },
    {
      id: 103,
      name: 'Miguel Ceballos Quiroz',
      email: 'miguelcq13@gmail.com',
      password: passwordHash,
      role: 'cliente',
      phone: '2283045591',
      createdAt: new Date('2026-04-22'),
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, phone: u.phone },
      create: u,
    });
  }
  console.log('✅ Users creados');

  // ── 3. PETS ────────────────────────────────────────────────────────────────
  const petsData = [
    {
      id: 201,
      petName: 'Firulais',
      species: 'perro',
      breed: 'Golden Retriever',
      weight: '30',
      ownerId: 101,
      notes: 'Alergia al pollo',
      history: [],
      createdAt: new Date('2026-01-12'),
    },
    {
      id: 202,
      petName: 'Luna',
      species: 'gato',
      breed: 'Siamés',
      weight: '4',
      ownerId: 102,
      notes: 'Muy nerviosa',
      history: [],
      createdAt: new Date('2026-01-12'),
    },
    {
      id: 203,
      petName: 'Aika',
      species: 'perro',
      breed: 'Pastor Australiano',
      weight: '15',
      ownerId: 103,
      notes: '',
      history: [],
      createdAt: new Date('2026-04-22'),
    },
  ];

  for (const p of petsData) {
    await prisma.pet.upsert({
      where: { id: p.id },
      update: { petName: p.petName, breed: p.breed, weight: p.weight },
      create: p,
    });
  }
  console.log('✅ Pets creados');

  // ── 4. SERVICES ────────────────────────────────────────────────────────────
  const servicesData = [
    { id: 1, title: 'Grooming básico pelo corto', description: 'Shampoo neutro especial para mascotas, cepillado preventivo, corte higiénico, limpieza superficial de oídos, talco ótico, corte en cojinetes, corte de uñas, limpieza dental y humectación de patitas. Perfume y adorno opcional.', category: 'Estética', icon: '✂️', color: 'blue', popular: false, priceMini: 180, priceChico: 220, priceMediano: 280, priceGrande: 350, priceExtra: 460, priceJumbo: 600, price: 180 },
    { id: 2, title: 'Grooming básico pelo largo', description: 'Shampoo neutro especial para mascotas, cepillado preventivo, corte higiénico, limpieza superficial de oídos, talco ótico, corte en cojinetes, corte de uñas, limpieza dental y humectación de patitas. Perfume y adorno opcional.', category: 'Estética', icon: '✂️', color: 'lavender', popular: true, priceMini: 200, priceChico: 250, priceMediano: 320, priceGrande: 410, priceExtra: 540, priceJumbo: 700, price: 200 },
    { id: 3, title: 'Baño y corte', description: 'Shampoo neutro especial para mascotas, cepillado preventivo, corte higiénico, limpieza superficial de oídos, talco ótico, corte en cojinetes, corte de uñas, limpieza dental y humectación de patitas. Perfume y adorno opcional.', category: 'Estética', icon: '🛁', color: 'blue', popular: false, priceMini: 230, priceChico: 290, priceMediano: 360, priceGrande: 460, priceExtra: 580, priceJumbo: 750, price: 230 },
    { id: 4, title: 'Servicio premium (shampoo especialidad)', description: 'Complemento al grooming básico o baño y corte. Escoge entre shampoos de especialidad: desmugrante, purificante, avena y miel, keratina, hidratante.', category: 'Estética', icon: '⭐', color: 'lavender', popular: false, priceMini: 20, priceChico: 20, priceMediano: 30, priceGrande: 30, priceExtra: 40, priceJumbo: 40, price: 20 },
    { id: 5, title: 'Baño antipulgas', description: 'Baño con shampoo especializado antipulgas. A consideración del estilista y el cliente.', category: 'Higiene', icon: '🛁', color: 'mint', popular: false, priceMini: 30, priceChico: 40, priceMediano: 50, priceGrande: 60, priceExtra: 70, priceJumbo: 80, price: 30 },
    { id: 6, title: 'Baño antiseborreico', description: 'Baño con shampoo especializado antiseborreico. A consideración del estilista y el cliente.', category: 'Higiene', icon: '🛁', color: 'mint', popular: false, priceMini: 30, priceChico: 40, priceMediano: 50, priceGrande: 60, priceExtra: 70, priceJumbo: 80, price: 30 },
    { id: 7, title: 'Desenredado (1 hr)', description: 'Servicio de desenredado por hora. A consideración del estilista y el cliente.', category: 'Higiene', icon: '🐾', color: 'blue', popular: false, priceMini: 80, priceChico: 100, priceMediano: 120, priceGrande: 140, priceExtra: 160, priceJumbo: 180, price: 80 },
    { id: 8, title: 'Deslanado / muda de pelo (1 hr)', description: 'Servicio de deslanado y muda de pelo por hora. A consideración del estilista y el cliente.', category: 'Higiene', icon: '🐾', color: 'blue', popular: false, priceMini: 60, priceChico: 80, priceMediano: 100, priceGrande: 120, priceExtra: 140, priceJumbo: 160, price: 60 },
    { id: 9, title: 'Corte de uñas', description: 'Corte y limado de uñas como servicio único.', category: 'Higiene', icon: '🐾', color: 'mint', popular: false, priceMini: 25, priceChico: 25, priceMediano: 30, priceGrande: 30, priceExtra: 40, priceJumbo: 40, price: 25 },
  ];

  for (const s of servicesData) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: { title: s.title, priceMini: s.priceMini, priceChico: s.priceChico, priceMediano: s.priceMediano, priceGrande: s.priceGrande, priceExtra: s.priceExtra, priceJumbo: s.priceJumbo },
      create: s,
    });
  }
  console.log('✅ Services creados');

  // ── 5. PRODUCTS ────────────────────────────────────────────────────────────
  const productsData = [
    { id: 1, name: 'Shampoo Antipulgas', price: 180, stock: 15, category: 'Higiene', description: 'Shampoo especial con ingredientes activos contra pulgas y garrapatas.' },
    { id: 2, name: 'Alimento Premium Adulto', price: 1200, stock: 2, category: 'Alimentos', description: 'Fórmula balanceada con proteínas de alta calidad para perros adultos.' },
    { id: 3, name: 'Collar Antipulgas', price: 320, stock: 8, category: 'Accesorios', description: 'Protección continua hasta 8 meses contra pulgas y garrapatas.' },
  ];

  for (const p of productsData) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: { price: p.price, stock: p.stock },
      create: p,
    });
  }
  console.log('✅ Products creados');

  // ── 6. APPOINTMENTS ────────────────────────────────────────────────────────
  const appointmentsData = [
    { id: 1001, clientId: 101, petId: 201, serviceId: 3, employeeId: null,  date: '2026-04-21', time: '10:15', status: 'Pendiente',  finalPrice: 460, notes: '', createdAt: new Date('2026-04-18') },
    { id: 1002, clientId: 102, petId: 202, serviceId: 1, employeeId: 2,     date: '2026-04-21', time: '11:00', status: 'Confirmada', finalPrice: 180, notes: '', createdAt: new Date('2026-04-19') },
    { id: 1003, clientId: 101, petId: 201, serviceId: 2, employeeId: null,  date: '2026-04-22', time: '10:15', status: 'Confirmada', finalPrice: 410, notes: '', createdAt: new Date('2026-04-20') },
    { id: 1004, clientId: 103, petId: 203, serviceId: 3, employeeId: 2,     date: '2026-04-22', time: '13:00', status: 'Confirmada', finalPrice: 360, notes: '', createdAt: new Date('2026-04-22') },
  ];

  for (const a of appointmentsData) {
    await prisma.appointment.upsert({
      where: { id: a.id },
      update: { status: a.status },
      create: a,
    });
  }
  console.log('✅ Appointments creados');

  // ── 7. SALES ───────────────────────────────────────────────────────────────
  const salesData = [
    { id: 1001, clientId: 101, total: 460, type: 'service', status: 'pagado', paymentMethod: 'efectivo', date: new Date('2026-04-10'), items: [{ name: 'Baño y corte (Firulais)', price: 460, quantity: 1 }] },
    { id: 1002, clientId: 102, total: 180, type: 'product', status: 'pagado', paymentMethod: 'efectivo', date: new Date('2026-04-12'), items: [{ name: 'Shampoo Antipulgas', price: 180, quantity: 1, productId: 1 }] },
    { id: 1003, clientId: 102, total: 180, type: 'service', status: 'pagado', paymentMethod: 'efectivo', date: new Date('2026-04-15'), items: [{ name: 'Grooming básico pelo corto (Luna)', price: 180, quantity: 1 }] },
    { id: 1004, clientId: 101, total: 440, type: 'service', status: 'pagado', paymentMethod: 'efectivo', date: new Date('2026-04-18'), items: [{ name: 'Grooming básico pelo largo + Corte de uñas', price: 440, quantity: 1 }] },
  ];

  for (const s of salesData) {
    const { items, ...saleData } = s;
    await prisma.sale.upsert({
      where: { id: s.id },
      update: {},
      create: {
        ...saleData,
        items: { create: items },
      },
    });
  }
  console.log('✅ Sales creados');

  console.log('\n🎉 Seed completado exitosamente.');
  console.log('─────────────────────────────────────');
  console.log('Cuentas de acceso (password: 123456):');
  console.log('  admin@mascotas.com     → administrador');
  console.log('  empleado@mascotas.com  → empleado');
  console.log('  miguelcq13@gmail.com   → cliente');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });