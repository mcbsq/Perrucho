// api/index.js
// Backend de Perrucho — Express + Prisma + PostgreSQL
// Patrón idéntico a Booz Studio.
//
// Local:      node api/index.js  (puerto 3001)
// Producción: Vercel invoca module.exports directamente (serverless)

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole, requireOwnerOrRole } = require('../middleware/auth');

// ── Singleton de Prisma para serverless (patrón Booz) ────────────────────────
if (!global.prisma) {
  global.prisma = new PrismaClient();
}
const prisma = global.prisma;

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://perrucho.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));

// ── Helpers ───────────────────────────────────────────────────────────────────
// Nunca exponer el password en respuestas
const safeUser = (user) => {
  if (!user) return null;
  const { password: _, ...rest } = user;
  return rest;
};

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('POST /api/login', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/signup  — registro de cliente con mascota (flujo booking express)
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, phone, password, pet } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: 'Nombre y email requeridos' });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

    const hash = await bcrypt.hash(password || 'perrucho123', 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hash,
        phone: phone || null,
        role: 'cliente',
        // Si viene mascota, la crea en la misma transacción
        pets: pet ? {
          create: {
            petName: pet.petName,
            species: pet.species || 'perro',
            breed: pet.breed || null,
            weight: pet.weight ? String(pet.weight) : null,
            notes: pet.notes || null,
          }
        } : undefined,
      },
      include: { pets: true },
    });

    const token = signToken(newUser);
    res.status(201).json({ token, user: safeUser(newUser) });
  } catch (err) {
    console.error('POST /api/signup', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/me — datos del usuario autenticado
app.get('/api/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { pets: true },
    });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/users — solo admin/empleado
app.get('/api/users', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(users.map(safeUser));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/users/:id
app.get('/api/users/:id', verifyToken, requireOwnerOrRole('administrador', 'empleado'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { pets: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/users/:id — actualizar perfil
app.put('/api/users/:id', verifyToken, requireOwnerOrRole('administrador'), async (req, res) => {
  try {
    const { password, role, ...data } = req.body; // no permitir cambiar password/role aquí
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/users — crear usuario (admin)
app.post('/api/users', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const { password, ...data } = req.body;
    const hash = await bcrypt.hash(password || 'perrucho123', 10);
    const user = await prisma.user.create({ data: { ...data, password: hash } });
    res.status(201).json(safeUser(user));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/users/:id — solo admin
app.delete('/api/users/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS (alias de users con role=cliente — compatibilidad con frontend)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/clients', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const clients = await prisma.user.findMany({
      where: { role: 'cliente' },
      include: { pets: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients.map(safeUser));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const client = await prisma.user.findFirst({
      where: { id: parseInt(req.params.id), role: 'cliente' },
      include: { pets: true },
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(safeUser(client));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/clients', async (req, res) => {
  // Ruta pública: registro de cliente desde booking express
  try {
    const { password, confirmPassword, ...data } = req.body;
    const hash = await bcrypt.hash(password || 'perrucho123', 10);
    const client = await prisma.user.create({
      data: { ...data, password: hash, role: 'cliente' },
    });
    res.status(201).json(safeUser(client));
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/clients/:id', verifyToken, async (req, res) => {
  try {
    const { password, confirmPassword, role, ...data } = req.body;
    const client = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(safeUser(client));
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/clients/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PETS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/pets', verifyToken, async (req, res) => {
  try {
    const where = req.query.ownerId ? { ownerId: parseInt(req.query.ownerId) } : {};
    const pets = await prisma.pet.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(pets);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    const pet = await prisma.pet.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' });
    res.json(pet);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/pets', async (req, res) => {
  // Pública para booking express
  try {
    const pet = await prisma.pet.create({ data: req.body });
    res.status(201).json(pet);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    const pet = await prisma.pet.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(pet);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.patch('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    const pet = await prisma.pet.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(pet);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    await prisma.pet.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/services', async (req, res) => {
  try {
    const services = await prisma.service.findMany({ orderBy: { id: 'asc' } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/services', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const service = await prisma.service.create({ data: req.body });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/services/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const service = await prisma.service.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/services/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/products', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/products/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.patch('/api/products/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/products/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────

const appointmentInclude = {
  client: { select: { id: true, name: true, email: true, phone: true } },
  pet: true,
  service: true,
  employee: { select: { id: true, name: true } },
  extras: { include: { service: true } },
};

app.get('/api/appointments', verifyToken, async (req, res) => {
  try {
    const where = {};
    if (req.query.clientId) where.clientId = parseInt(req.query.clientId);
    if (req.query.employeeId) where.employeeId = parseInt(req.query.employeeId);
    if (req.query.date) where.date = req.query.date;
    if (req.query.status) where.status = req.query.status;

    const appointments = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: parseInt(req.params.id) },
      include: appointmentInclude,
    });
    if (!appt) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/appointments', async (req, res) => {
  // Pública para booking express (clientes sin sesión)
  try {
    const { extras, ...data } = req.body;
    const appt = await prisma.appointment.create({
      data: {
        ...data,
        extras: extras ? { create: extras } : undefined,
      },
      include: appointmentInclude,
    });
    res.status(201).json(appt);
  } catch (err) {
    console.error('POST /api/appointments', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    const { extras, ...data } = req.body;
    const appt = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: appointmentInclude,
    });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.patch('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    const { extras, ...data } = req.body;
    const appt = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: appointmentInclude,
    });
    res.json(appt);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/appointments/:id/extras — agregar servicios adicionales a una cita
app.post('/api/appointments/:id/extras', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { serviceId, price } = req.body;
    const extra = await prisma.appointmentExtra.create({
      data: {
        appointmentId: parseInt(req.params.id),
        serviceId,
        price,
      },
      include: { service: true },
    });
    res.status(201).json(extra);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/appointments/:id/extras/:extraId', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    await prisma.appointmentExtra.delete({ where: { id: parseInt(req.params.extraId) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SALES
// ─────────────────────────────────────────────────────────────────────────────

const saleInclude = {
  client: { select: { id: true, name: true, email: true } },
  items: { include: { product: true } },
  appointment: { select: { id: true, date: true, time: true } },
};

app.get('/api/sales', verifyToken, async (req, res) => {
  try {
    const where = {};

    if (req.user.role === 'cliente') {
      // Un cliente solo puede ver sus propias ventas
      where.clientId = req.user.id;
    } else {
      // Admin/empleado pueden filtrar por cualquier clientId
      if (req.query.clientId) where.clientId = parseInt(req.query.clientId);
      if (req.query.status)   where.status   = req.query.status;
      if (req.query.type)     where.type     = req.query.type;
    }

    const sales = await prisma.sale.findMany({
      where,
      include: saleInclude,
      orderBy: { date: 'desc' },
    });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/sales/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: parseInt(req.params.id) },
      include: saleInclude,
    });
    if (!sale) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/sales', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const sale = await prisma.sale.create({
      data: {
        ...data,
        items: items ? { create: items } : undefined,
      },
      include: saleInclude,
    });
    res.status(201).json(sale);
  } catch (err) {
    console.error('POST /api/sales', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/sales/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const sale = await prisma.sale.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: saleInclude,
    });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.patch('/api/sales/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const sale = await prisma.sale.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: saleInclude,
    });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/sales/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.sale.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/settings — pública (el frontend necesita saber si booking express está activo)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/settings — solo admin
app.put('/api/settings', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: req.body,
      create: { id: 1, ...req.body },
    });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// ARRANQUE LOCAL vs PRODUCCIÓN (patrón Booz)
// ─────────────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🐾 Perrucho API corriendo en http://localhost:${PORT}/api`);
  });
}

module.exports = app;