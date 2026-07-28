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
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, requireRole, requireOwnerOrRole } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('./mailer');

// ── Singleton de Prisma para serverless (patrón Booz) ────────────────────────
if (!global.prisma) {
  global.prisma = new PrismaClient();
}
const prisma = global.prisma;

// Mismos horarios que ofrece el booking express en el frontend
// (src/pages/Home.jsx `availableTimes`) — mantener sincronizados.
const SHOP_TIME_SLOTS = ['10:15', '11:00', '11:45', '12:30', '13:15', '14:00', '14:45', '15:30', '16:15', '17:00'];

// El frontend (STATUS_TRANSITIONS en src/utils/apptStatus.js) usa las
// etiquetas 'En proceso' y 'Finalizada' en toda la UI, pero el enum
// AppointmentStatus de Prisma es EnProceso/Completada (sin espacio, otro
// nombre) — enviar el valor tal cual crasheaba el update ("Error del
// servidor" al marcar una cita en proceso o finalizada). Se traduce en
// ambas direcciones aquí para no tocar toda la UI del frontend.
const STATUS_LABEL_TO_ENUM = { 'En proceso': 'EnProceso', 'Finalizada': 'Completada' };
const STATUS_ENUM_TO_LABEL = { EnProceso: 'En proceso', Completada: 'Finalizada' };
const withLabelStatus = (appt) => appt && appt.status in STATUS_ENUM_TO_LABEL
  ? { ...appt, status: STATUS_ENUM_TO_LABEL[appt.status] }
  : appt;

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

// ── Rate limiting para rutas públicas de booking express ─────────────────────
// Sin esto, /api/signup, /api/clients, /api/pets y /api/appointments son
// blancos abiertos de spam/abuso al no requerir autenticación.
const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
});

// Más estricto que publicWriteLimiter — /api/login y /api/auth/* son blanco
// de fuerza bruta / abuso de enumeración de emails y no tenían límite alguno.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
});

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
app.post('/api/login', authLimiter, async (req, res) => {
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
app.post('/api/signup', publicWriteLimiter, async (req, res) => {
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

// POST /api/auth/forgot-password — solicita un enlace de restablecimiento.
// Siempre responde { ok: true } exista o no el email, para no permitir
// enumerar cuentas registradas a partir de la respuesta.
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });

      const base = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${base}/restablecer-contrasena?token=${resetToken}`;
      const sent = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl }).catch(err => {
        console.error('sendPasswordResetEmail', err);
        return false;
      });
      if (!sent) console.warn(`[forgot-password] Correo no enviado (SMTP no configurado). Enlace para ${user.email}: ${resetUrl}`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/forgot-password', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/reset-password — completa el restablecimiento con el token.
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token y nueva contraseña requeridos' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'El enlace es inválido o expiró. Solicita uno nuevo.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash, resetToken: null, resetTokenExpiry: null },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/reset-password', err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/users — solo admin/empleado
app.get('/api/users', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    // Solo empleados y administradores — los clientes se gestionan vía /api/clients
    const users = await prisma.user.findMany({
      where: { role: { in: ['administrador', 'empleado'] } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(safeUser));
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/users — crear usuario (admin) — solo empleado/administrador
app.post('/api/users', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const { password, role, ...data } = req.body;
    // Forzar rol válido — esta ruta es solo para staff, no clientes
    const validRole = ['administrador', 'empleado'].includes(role) ? role : 'empleado';
    const hash = await bcrypt.hash(password || 'perrucho123', 10);
    const user = await prisma.user.create({ data: { ...data, password: hash, role: validRole } });
    res.status(201).json(safeUser(user));
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/clients', publicWriteLimiter, async (req, res) => {
  // Ruta pública: registro de cliente desde booking express
  try {
    const { password, confirmPassword, ...data } = req.body;
    if (!data.name || !data.email)
      return res.status(400).json({ error: 'Nombre y email requeridos' });
    const hash = await bcrypt.hash(password || 'perrucho123', 10);
    const client = await prisma.user.create({
      data: { ...data, password: hash, role: 'cliente' },
    });
    res.status(201).json(safeUser(client));
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/clients/:id', verifyToken, requireOwnerOrRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { password, confirmPassword, role, ...data } = req.body;
    const client = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
    });
    res.json(safeUser(client));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/clients/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PETS
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/pets', verifyToken, async (req, res) => {
  try {
    // IDOR fix: para un cliente, ownerId ya no es un filtro opcional — se
    // fuerza siempre a su propio id (antes podía omitirse y listar las
    // mascotas de todo el negocio).
    const where = req.user.role === 'cliente'
      ? { ownerId: req.user.id }
      : (req.query.ownerId ? { ownerId: parseInt(req.query.ownerId) } : {});
    const pets = await prisma.pet.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(pets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    const pet = await prisma.pet.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' });
    if (req.user.role === 'cliente' && pet.ownerId !== req.user.id)
      return res.status(403).json({ error: 'No tienes permiso para ver esta mascota' });
    res.json(pet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/pets', publicWriteLimiter, async (req, res) => {
  // Pública para booking express
  try {
    // ownerId llega como string desde el <select> del formulario — el schema
    // lo define como Int, así que Prisma rechaza el string con un error de
    // validación (500 genérico) si no se convierte aquí.
    const { ownerId, ...rest } = req.body;
    if (!rest.petName || !ownerId)
      return res.status(400).json({ error: 'Nombre de mascota y dueño requeridos' });
    const pet = await prisma.pet.create({ data: { ...rest, ownerId: parseInt(ownerId) } });
    res.status(201).json(pet);
  } catch (err) {
    console.error('Error creando mascota:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// IDOR fix: análogo a assertAppointmentOwnership — un cliente solo puede
// editar/borrar mascotas de las que es dueño.
const assertPetOwnership = async (req, res) => {
  if (req.user.role !== 'cliente') return true;
  const existing = await prisma.pet.findUnique({ where: { id: parseInt(req.params.id) }, select: { ownerId: true } });
  if (!existing) { res.status(404).json({ error: 'Mascota no encontrada' }); return false; }
  if (existing.ownerId !== req.user.id) { res.status(403).json({ error: 'No tienes permiso sobre esta mascota' }); return false; }
  return true;
};

app.put('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    if (!(await assertPetOwnership(req, res))) return;
    const { ownerId, ...rest } = req.body;
    const pet = await prisma.pet.update({
      where: { id: parseInt(req.params.id) },
      data: { ...rest, ...(ownerId !== undefined && { ownerId: parseInt(ownerId) }) },
    });
    res.json(pet);
  } catch (err) {
    console.error('Error actualizando mascota:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.patch('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    if (!(await assertPetOwnership(req, res))) return;
    const { ownerId, ...rest } = req.body;
    const pet = await prisma.pet.update({
      where: { id: parseInt(req.params.id) },
      data: { ...rest, ...(ownerId !== undefined && { ownerId: parseInt(ownerId) }) },
    });
    res.json(pet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/pets/:id', verifyToken, async (req, res) => {
  try {
    if (!(await assertPetOwnership(req, res))) return;
    await prisma.pet.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/services/:id', async (req, res) => {
  try {
    const service = await prisma.service.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Los inputs de precio en el form son <input type="number">, que en React
// siempre entregan string — hay que convertir antes de pasarlos a Prisma
// (mismo problema que ownerId en /api/pets y price/stock en /api/products).
const PRICE_FIELDS = ['priceMini', 'priceChico', 'priceMediano', 'priceGrande', 'priceExtra', 'priceJumbo', 'price'];
const normalizeServiceBody = (body) => {
  const { customPriceOptions, ...rest } = body;
  const data = { ...rest };
  for (const f of PRICE_FIELDS) {
    if (data[f] !== undefined) data[f] = parseInt(data[f]) || 0;
  }
  if (customPriceOptions !== undefined) {
    data.customPriceOptions = customPriceOptions.map(o => ({ ...o, price: Number(o.price) || 0 }));
  }
  return data;
};

app.post('/api/services', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const service = await prisma.service.create({ data: normalizeServiceBody(req.body) });
    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/services/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const service = await prisma.service.update({
      where: { id: parseInt(req.params.id) },
      data: normalizeServiceBody(req.body),
    });
    res.json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/services/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// price/stock llegan como string desde <input type="number"> — el schema
// los define como Int, así que hay que convertirlos antes de pasarlos a
// Prisma (mismo problema que ownerId en /api/pets). Igual para price/stock
// dentro de cada variante.
const normalizeProductBody = (body) => {
  const { price, stock, variants, ...rest } = body;
  const data = { ...rest };
  if (price !== undefined) data.price = parseInt(price);
  if (stock !== undefined) data.stock = parseInt(stock);
  if (variants !== undefined) {
    data.variants = variants.map(v => ({ ...v, price: Number(v.price) || 0, stock: parseInt(v.stock) || 0 }));
  }
  return data;
};

app.post('/api/products', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const product = await prisma.product.create({ data: normalizeProductBody(req.body) });
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// empleado puede editar (necesita descontar stock al vender en el POS)
app.put('/api/products/:id', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: normalizeProductBody(req.body),
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.patch('/api/products/:id', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: normalizeProductBody(req.body),
    });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/products/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
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
    if (req.query.status) where.status = STATUS_LABEL_TO_ENUM[req.query.status] || req.query.status;
    // IDOR fix: un cliente solo puede ver SUS citas — sin esto, cualquier
    // cliente logueado podía traer las citas (nombre, teléfono, notas) de
    // todos los demás clientes con un simple GET /api/appointments sin filtro.
    if (req.user.role === 'cliente') where.clientId = req.user.id;

    const appointments = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: [{ date: 'desc' }, { time: 'asc' }],
    });
    res.json(appointments.map(withLabelStatus));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Mismo criterio que validateSlot() en el frontend: una cita "ocupa" toda la
// ventana de ±59 min alrededor de su hora. Capacidad total = suma de
// capacity de los empleados (default 1 c/u si no hay ninguno configurado).
const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };

async function getFullSlotsForDate(date, excludeApptId = null) {
  const [appointments, employees] = await Promise.all([
    prisma.appointment.findMany({
      where: { date, status: { notIn: ['Cancelada', 'Completada'] } },
      select: { id: true, time: true },
    }),
    prisma.user.findMany({ where: { role: 'empleado' }, select: { capacity: true } }),
  ]);
  const totalCapacity = employees.reduce((sum, e) => sum + (Number(e.capacity) || 1), 0) || 1;
  const bookedMinutes = appointments
    .filter(a => a.time && a.id !== excludeApptId)
    .map(a => toMinutes(a.time));

  return SHOP_TIME_SLOTS.filter(slot => {
    const slotMin = toMinutes(slot);
    const conflicts = bookedMinutes.filter(m => Math.abs(m - slotMin) < 60).length;
    return conflicts >= totalCapacity;
  });
}

// GET /api/appointments/availability?date=YYYY-MM-DD — pública (la necesita
// el booking express, que corre sin sesión). Devuelve solo qué horarios ya
// están llenos ese día, sin exponer datos de otras citas/clientes.
// IMPORTANTE: debe ir antes de '/api/appointments/:id' — si no, Express
// interpretaría "availability" como un :id.
app.get('/api/appointments/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Fecha requerida' });
    const fullSlots = await getFullSlotsForDate(date);
    res.json({ fullSlots });
  } catch (err) {
    console.error(err);
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
    if (req.user.role === 'cliente' && appt.clientId !== req.user.id)
      return res.status(403).json({ error: 'No tienes permiso para ver esta cita' });
    res.json(withLabelStatus(appt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/appointments', publicWriteLimiter, async (req, res) => {
  // Pública para booking express (clientes sin sesión) Y para el flujo de
  // reserva con cuenta (ServiceModal): ese flujo solo pide el DÍA a propósito
  // — el groomer asigna la hora después desde su calendario — así que time
  // llega como '' intencionalmente y NO debe exigirse aquí.
  try {
    const { extras, ...data } = req.body;
    if (!data.date)
      return res.status(400).json({ error: 'Fecha requerida' });
    // Revalidar disponibilidad en el servidor (evita que dos personas
    // reserven el mismo horario a la vez — el frontend ya filtra los
    // horarios llenos, pero esto cierra la condición de carrera).
    if (data.time) {
      const fullSlots = await getFullSlotsForDate(data.date);
      if (fullSlots.includes(data.time)) {
        return res.status(409).json({ error: 'Ese horario ya no está disponible. Elige otro.' });
      }
    }
    const appt = await prisma.appointment.create({
      data: {
        ...data,
        extras: extras ? { create: extras } : undefined,
      },
      include: appointmentInclude,
    });
    res.status(201).json(withLabelStatus(appt));
  } catch (err) {
    console.error('POST /api/appointments', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

const normalizeAppointmentBody = (body) => {
  const { extras, ...data } = body;
  if (data.status && STATUS_LABEL_TO_ENUM[data.status]) {
    data.status = STATUS_LABEL_TO_ENUM[data.status];
  }
  return { data, extras };
};

// IDOR fix: PUT/PATCH/DELETE solo exigían estar logueado, sin comprobar que
// la cita perteneciera al cliente que la solicita — cualquier cliente podía
// editar/cancelar/borrar la cita de otro. Admin/empleado siguen sin restricción.
const assertAppointmentOwnership = async (req, res) => {
  if (req.user.role !== 'cliente') return true;
  const existing = await prisma.appointment.findUnique({ where: { id: parseInt(req.params.id) }, select: { clientId: true } });
  if (!existing) { res.status(404).json({ error: 'Cita no encontrada' }); return false; }
  if (existing.clientId !== req.user.id) { res.status(403).json({ error: 'No tienes permiso sobre esta cita' }); return false; }
  return true;
};

app.put('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    if (!(await assertAppointmentOwnership(req, res))) return;
    const { data } = normalizeAppointmentBody(req.body);
    const appt = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: appointmentInclude,
    });
    res.json(withLabelStatus(appt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.patch('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    if (!(await assertAppointmentOwnership(req, res))) return;
    const { data } = normalizeAppointmentBody(req.body);
    const appt = await prisma.appointment.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: appointmentInclude,
    });
    res.json(withLabelStatus(appt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    if (!(await assertAppointmentOwnership(req, res))) return;
    await prisma.appointment.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/appointments/:id/extras/:extraId', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    await prisma.appointmentExtra.delete({ where: { id: parseInt(req.params.extraId) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/sales', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
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
    console.error(err);
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
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/sales/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.sale.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES (egresos/gastos) — el Panel de control solo mostraba ingresos.
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/expenses', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    res.json(expenses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/expenses', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { concept, amount, category, notes, date } = req.body;
    if (!concept || !amount)
      return res.status(400).json({ error: 'Concepto y monto requeridos' });

    const expense = await prisma.expense.create({
      data: {
        concept,
        amount: Number(amount),
        category: category || 'Otro',
        notes: notes || null,
        date: date ? new Date(date) : undefined,
        createdBy: req.user.id,
      },
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/expenses/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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