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
const { verifyToken, attachUserIfPresent, requireRole, requireOwnerOrRole } = require('../middleware/auth');
const { resolveBusiness } = require('../middleware/tenant');

// Cliente Prisma con aislamiento multi-tenant automático (ver
// api/lib/tenantClient.js) — cada prisma.<modelo> de negocio (User, Pet,
// Service, Product, Appointment, Expense, Sale, Settings) queda filtrado por
// el businessId de la request en curso sin que cada ruta de abajo tenga que
// acordarse de hacerlo a mano.
const prisma = require('./lib/tenantClient');
// Cliente sin aislamiento — necesario para resolver el slug de un negocio,
// que por definición pasa ANTES de saber a qué businessId pertenece la
// request (ver api/lib/prismaRaw.js).
const prismaRaw = require('./lib/prismaRaw');
const aegisClient = require('./lib/aegisClient');
const { getGiroPreset } = require('./config/giroPresets');

// Horario por defecto si un negocio todavía no tiene Settings creado (no
// debería pasar en producción, pero evita que availability truene antes de
// que exista la fila) — mismos valores que el default de Settings.businessHours.
const DEFAULT_BUSINESS_HOURS = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, open: true, start: '10:15', end: '17:00' }));

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

// ── Multi-tenant: resolver el negocio antes de cualquier ruta ────────────────
// attachUserIfPresent decodifica el JWT si viene (sin bloquear rutas
// públicas); resolveBusiness usa ese req.user (rutas autenticadas) o el
// header X-Business-Slug (rutas públicas, ver middleware/tenant.js) para
// fijar req.businessId y envolver el resto de la request en el contexto que
// lee api/lib/tenantClient.js. Van antes de CUALQUIER ruta para no tener que
// repetirlos en cada una.
app.use(attachUserIfPresent);
app.use(resolveBusiness);

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
// Nunca exponer el password, hashes ni tokens de recuperación en respuestas
const safeUser = (user) => {
  if (!user) return null;
  const { password: _p, securityAnswerHash: _sa, resetToken: _rt, resetTokenExpiry: _rte, ...rest } = user;
  return rest;
};

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, businessId: user.businessId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/login
// El corte a AEGIS es por negocio (Business.authProvider), no global — así
// Taylor's sigue exactamente en el flujo de bcrypt de siempre mientras no se
// haga su propio cutover explícito, y un negocio nuevo puede nacer
// directamente en modo AEGIS sin afectar a los demás.
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const business = await prismaRaw.business.findUnique({ where: { id: req.businessId } });

    if (business?.authProvider === 'aegis') {
      const { data: tokens, error: loginErr } = await aegisClient.passwordLogin(email, password);
      if (loginErr) {
        const { body, status } = loginErr;
        if (status === 401 || status === 403) return res.status(401).json({ error: 'Credenciales incorrectas' });
        if (status === 503) return res.status(503).json(body);
        console.warn('AEGIS login HTTP', status, body);
        return res.status(502).json({ error: 'No se pudo iniciar sesión' });
      }

      const { data: profile, error: meErr } = await aegisClient.getMe(tokens.access_token);
      if (meErr) {
        console.error('AEGIS /v1/me falló', meErr);
        return res.status(502).json({ error: 'No se pudo validar la sesión' });
      }

      const aegisEmail = (profile.email || '').trim().toLowerCase();
      let user = await prisma.user.findFirst({ where: { aegisUserId: String(profile.id) } });
      if (!user && aegisEmail) {
        user = await prisma.user.findFirst({ where: { email: aegisEmail } });
      }
      if (!user) {
        return res.status(403).json({ error: 'Cuenta no registrada en este negocio. Contacta a un administrador.' });
      }

      const token = signToken(user);
      return res.json({
        token,
        user: safeUser(user),
        mustChangePassword: Boolean(tokens.must_change_password),
      });
    }

    // Modo local (bcrypt) — comportamiento sin cambios.
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.password) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('POST /api/login', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/change-password — el propio usuario cambia su contraseña.
// Obligatorio tras un primer login con contraseña temporal (mustChangePassword),
// pero disponible en cualquier momento. Rama por negocio igual que login.
app.post('/api/auth/change-password', authLimiter, verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const business = await prismaRaw.business.findUnique({ where: { id: req.businessId } });

    if (business?.authProvider === 'aegis' && user.aegisUserId) {
      if (newPassword.length < 12) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 12 caracteres.' });
      }
      const { error } = await aegisClient.changePassword(user.email, currentPassword, newPassword);
      if (error) {
        const { status } = error;
        if (status === 401 || status === 403) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        console.warn('AEGIS changePassword falló:', error);
        return res.status(502).json({ error: 'No se pudo cambiar la contraseña' });
      }
      return res.json({ ok: true });
    }

    // Modo local — comportamiento bcrypt directo.
    if (!user.password) return res.status(400).json({ error: 'Esta cuenta no tiene contraseña local' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/change-password', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/signup  — registro de cliente con mascota (flujo booking express)
app.post('/api/signup', publicWriteLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, securityQuestion, securityAnswer, pet } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: 'Nombre y email requeridos' });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'El email ya está registrado' });

    const business = await prismaRaw.business.findUnique({ where: { id: req.businessId } });
    const petData = pet ? {
      create: {
        petName: pet.petName,
        species: pet.species || 'perro',
        breed: pet.breed || null,
        weight: pet.weight ? String(pet.weight) : null,
        notes: pet.notes || null,
      }
    } : undefined;

    let newUser, tempPassword;

    if (business?.authProvider === 'aegis') {
      // El cliente confirmó: todo usuario (incluidos los que se
      // autorregistran) pasa por AEGIS — recibe una contraseña temporal en
      // vez de elegir la suya, y la cambia en su primer login, igual que
      // el personal. No se guarda password ni pregunta de seguridad local.
      const { data: aegisUser, error: aegisErr } = await aegisClient.adminCreateUser(email, 'cliente');
      if (aegisErr) {
        const { body, status } = aegisErr;
        console.warn('AEGIS adminCreateUser (signup) falló:', status, body);
        if (status === 409) return res.status(409).json({ error: 'El email ya está registrado' });
        return res.status(502).json({ error: 'No se pudo crear la cuenta. Intenta de nuevo.' });
      }
      tempPassword = aegisUser.tempPassword;

      newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          aegisUserId: String(aegisUser.id),
          phone: phone || null,
          role: 'cliente',
          pets: petData,
        },
        include: { pets: true },
      });
    } else {
      const hash = await bcrypt.hash(password || 'perrucho123', 10);
      // Pregunta de seguridad — único mecanismo de "olvidé mi contraseña" sin
      // depender de SMTP, para negocios que sigan en modo local.
      const answerHash = securityAnswer
        ? await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10)
        : null;

      newUser = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hash,
          phone: phone || null,
          role: 'cliente',
          securityQuestion: securityQuestion || null,
          securityAnswerHash: answerHash,
          pets: petData,
        },
        include: { pets: true },
      });
    }

    const token = signToken(newUser);
    const response = { token, user: safeUser(newUser) };
    if (tempPassword) response.tempPassword = tempPassword;
    res.status(201).json(response);
  } catch (err) {
    console.error('POST /api/signup', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// "Olvidé mi contraseña" 100% interno — sin SMTP ni servicio de correo de
// terceros. El sistema recupera la cuenta verificando la pregunta de
// seguridad elegida en el registro; solo al responderla correctamente se
// emite un token de un solo uso (mismas columnas resetToken/resetTokenExpiry
// que antes usaba el flujo por correo) que habilita el cambio de contraseña.

// POST /api/auth/security-question — devuelve la pregunta configurada.
// Respuesta genérica (hasQuestion:false) si el email no existe o no tiene
// pregunta configurada, para no revelar cuentas registradas.
app.post('/api/auth/security-question', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requerido' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && user.securityQuestion && user.securityAnswerHash) {
      return res.json({ hasQuestion: true, question: user.securityQuestion });
    }
    res.json({ hasQuestion: false });
  } catch (err) {
    console.error('POST /api/auth/security-question', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/verify-answer — valida la respuesta y, si es correcta,
// emite un token de restablecimiento de un solo uso (válido 15 min).
app.post('/api/auth/verify-answer', authLimiter, async (req, res) => {
  try {
    const { email, answer } = req.body;
    if (!email || !answer) return res.status(400).json({ error: 'Respuesta requerida' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.securityAnswerHash) {
      return res.status(400).json({ error: 'No se pudo verificar la respuesta.' });
    }

    const valid = await bcrypt.compare(answer.trim().toLowerCase(), user.securityAnswerHash);
    if (!valid) return res.status(400).json({ error: 'Respuesta incorrecta.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });

    // El frontend necesita saber ANTES de pedir la nueva contraseña si este
    // negocio es AEGIS — ahí no se puede reutilizar el password que la
    // persona elija (AEGIS siempre genera el suyo), así que el paso 3 del
    // flujo se ve distinto según el modo (ver reset-password abajo).
    const business = await prismaRaw.business.findUnique({ where: { id: req.businessId } });
    res.json({ resetToken, authProvider: business?.authProvider || 'local' });
  } catch (err) {
    console.error('POST /api/auth/verify-answer', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/reset-password — completa el restablecimiento con el token.
//
// Bug real corregido: esta ruta escribía directo al password local (bcrypt)
// SIN revisar el authProvider del negocio. Para un negocio en modo AEGIS,
// el login nunca lee ese campo (pasa por aegisClient.passwordLogin), así
// que la persona veía "contraseña actualizada" pero seguía sin poder
// entrar — un reset que no restablecía nada. AEGIS tampoco acepta una
// contraseña elegida por el usuario (siempre genera la suya), así que en
// modo AEGIS este endpoint ignora newPassword y usa adminResetPassword,
// devolviendo la temporal para mostrarla una vez (mismo patrón que el
// alta de negocio y la creación de usuarios).
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requerido' });

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'El enlace es inválido o expiró. Solicita uno nuevo.' });
    }

    const business = await prismaRaw.business.findUnique({ where: { id: req.businessId } });

    if (business?.authProvider === 'aegis' && user.aegisUserId) {
      const { data, error } = await aegisClient.adminResetPassword(user.aegisUserId);
      if (error) {
        console.warn('AEGIS adminResetPassword (reset-password) falló:', error);
        return res.status(502).json({ error: 'No se pudo restablecer la contraseña. Intenta de nuevo.' });
      }
      await prisma.user.update({ where: { id: user.id }, data: { resetToken: null, resetTokenExpiry: null } });
      return res.json({ ok: true, tempPassword: data.tempPassword });
    }

    // Modo local — comportamiento de siempre.
    if (!newPassword) return res.status(400).json({ error: 'Nueva contraseña requerida' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

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
// BUSINESS (multi-tenant)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/business/:slug — pública, resuelve el slug de la URL al negocio.
// El frontend la llama primero (BusinessLayout) para saber si el slug existe
// antes de mandar cualquier otra request con X-Business-Slug.
app.get('/api/business/:slug', async (req, res) => {
  try {
    const business = await prismaRaw.business.findUnique({ where: { slug: req.params.slug } });
    if (!business || !business.isActive) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }
    res.json({
      id: business.id,
      slug: business.slug,
      name: business.name,
      giro: business.giro,
      authProvider: business.authProvider,
    });
  } catch (err) {
    console.error('GET /api/business/:slug', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Segmentos de URL que ya significan otra cosa (rutas top-level de App.js) —
// un negocio no puede registrarse con estos como slug o quedaría inalcanzable.
const RESERVED_SLUGS = [
  'admin-dashboard', 'employee-dashboard', 'perfil', 'api',
  'acceso', 'registro', 'olvide-contrasena', 'crear-negocio',
  'servicios', 'tienda', 'sobre-nosotros', 'contacto',
];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// GET /api/business/check-slug/:slug — disponibilidad en vivo mientras se
// escribe el formulario de alta, antes de someter el registro completo.
app.get('/api/business/check-slug/:slug', async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();
    if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.includes(slug)) {
      return res.json({ available: false });
    }
    const existing = await prismaRaw.business.findUnique({ where: { slug } });
    res.json({ available: !existing });
  } catch (err) {
    console.error('GET /api/business/check-slug', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/business/register — alta de negocio 100% self-service: nace
// directo en modo AEGIS (sin la migración manual que le hicimos a Taylor's),
// con su primer administrador ya logueado al terminar. De uso libre por
// ahora — sin pago; cuando exista suscripción, aquí es donde se agregaría
// la validación antes de crear el negocio, no hace falta tocar nada más.
app.post('/api/business/register', publicWriteLimiter, async (req, res) => {
  const { businessName, slug: rawSlug, giro, adminName, adminEmail, logoUrl } = req.body;
  if (!businessName || !rawSlug || !adminName || !adminEmail) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  // Sin logo propio no hay forma de distinguir un negocio nuevo del resto —
  // sin esto, la marca/ícono por defecto termina siendo el de Taylor's,
  // que es exactamente el bug que ya se reportó una vez.
  if (!logoUrl) {
    return res.status(400).json({ error: 'El logo del negocio es obligatorio.' });
  }

  const slug = String(rawSlug).toLowerCase().trim();
  if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.includes(slug)) {
    return res.status(400).json({ error: 'Ese identificador de URL no es válido o ya está reservado.' });
  }

  let business, settings;
  try {
    const existing = await prismaRaw.business.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ error: 'Ese identificador de URL ya está en uso.' });

    const existingUser = await prismaRaw.user.findFirst({ where: { email: adminEmail.toLowerCase() } });
    if (existingUser) return res.status(409).json({ error: 'Ese correo ya está registrado en Perrucho.' });

    const preset = getGiroPreset(giro);

    business = await prismaRaw.business.create({
      data: { slug, name: businessName, giro: giro || 'mascotas', authProvider: 'aegis', isActive: true },
    });
    settings = await prismaRaw.settings.create({
      data: {
        businessId: business.id,
        businessName,
        logoUrl,
        enablePets: preset.enablePets,
        heroTagline: preset.copy.heroTagline,
        heroSubtitle: preset.copy.heroSubtitle,
        clientExtraFields: preset.clientExtraFieldsDefault,
        // Herramientas específicas por giro — ver docs/superpowers/specs/
        // 2026-08-21-herramientas-por-giro-design.md. Explícito por la misma
        // razón que el resto de este objeto: un negocio nuevo no debe
        // depender del default de la columna (que es "todo apagado", seguro
        // para negocios YA existentes, pero no necesariamente lo correcto
        // para el giro que se está registrando ahora).
        enableStaffSelection: preset.enableStaffSelectionDefault,
        enableMemberships: preset.enableMembershipsDefault,
        enableClientNotes: preset.enableClientNotesDefault,
        enableTableReservations: preset.enableTableReservationsDefault,
        // Explícito a propósito, aunque ya sea el default de la columna —
        // un negocio nuevo nunca debe depender de un default implícito
        // para datos propios del negocio (contacto, redes, slogan). Bug
        // real que ya pasó una vez: esos defaults eran los datos REALES de
        // Taylor's, así que cualquier negocio que no los llenara los
        // heredaba (WhatsApp, dirección, Instagram/Facebook/TikTok).
        slogan: `¡Bienvenido a ${businessName}!`,
        whatsappNumber: '',
        businessAddress: '',
        businessMapsUrl: '',
        instagramUrl: '',
        facebookUrl: '',
        tiktokUrl: '',
      },
    });

    const { data: aegisUser, error: aegisErr } = await aegisClient.adminCreateUser(adminEmail, 'administrador');
    if (aegisErr) {
      // Compensación best-effort — AEGIS no participa de una transacción de
      // Postgres, así que si falla aquí no dejamos el negocio a medias.
      await prismaRaw.settings.delete({ where: { id: settings.id } }).catch(() => {});
      await prismaRaw.business.delete({ where: { id: business.id } }).catch(() => {});
      const { body, status } = aegisErr;
      console.warn('AEGIS adminCreateUser (alta de negocio) falló:', status, body);
      return res.status(502).json({ error: 'No se pudo crear tu cuenta de administrador. Intenta de nuevo.' });
    }

    const adminUser = await prismaRaw.user.create({
      data: {
        businessId: business.id,
        name: adminName,
        email: adminEmail.toLowerCase(),
        aegisUserId: String(aegisUser.id),
        role: 'administrador',
      },
    });

    const token = signToken({ ...adminUser, businessId: business.id });
    res.status(201).json({
      token,
      user: safeUser(adminUser),
      tempPassword: aegisUser.tempPassword,
      slug: business.slug,
    });
  } catch (err) {
    console.error('POST /api/business/register', err);
    if (business) await prismaRaw.settings.deleteMany({ where: { businessId: business.id } }).catch(() => {});
    if (business) await prismaRaw.business.delete({ where: { id: business.id } }).catch(() => {});
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN — cuenta única, por encima de cualquier negocio (businessId
// null en su fila de User). No pasa por el login normal a propósito: ese
// flujo (/api/login) siempre resuelve contra req.businessId, que para esta
// cuenta no existe — usa prismaRaw en todo este bloque (nunca el `prisma`
// con tenant scoping) porque cruza negocios intencionalmente.
// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/superadmin/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const user = await prismaRaw.user.findFirst({ where: { email: email.toLowerCase(), role: 'superadmin' } });
    if (!user || !user.password) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('POST /api/superadmin/login', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/superadmin/businesses — todas las empresas registradas, con
// conteo de usuarios propio de cada una (Promise.all en vez de un JOIN: son
// pocas empresas, y así se reutiliza prismaRaw.user.count tal cual).
app.get('/api/superadmin/businesses', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const businesses = await prismaRaw.business.findMany({ orderBy: { createdAt: 'desc' } });
    const withCounts = await Promise.all(businesses.map(async (b) => ({
      ...b,
      userCount: await prismaRaw.user.count({ where: { businessId: b.id } }),
    })));
    res.json(withCounts);
  } catch (err) {
    console.error('GET /api/superadmin/businesses', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/superadmin/businesses/:slug/enter — "entrar" a una empresa: en
// vez de construir un panel cruzado paralelo, emite el mismo token que
// recibiría su propio administrador al iniciar sesión — el frontend hace
// establishSession() con él y cae directo en /:slug/admin-dashboard,
// reutilizando 100% del panel ya existente en vez de duplicarlo.
app.post('/api/superadmin/businesses/:slug/enter', verifyToken, requireRole('superadmin'), async (req, res) => {
  try {
    const business = await prismaRaw.business.findUnique({ where: { slug: req.params.slug } });
    if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

    const adminUser = await prismaRaw.user.findFirst({
      where: { businessId: business.id, role: 'administrador' },
      orderBy: { id: 'asc' },
    });
    if (!adminUser) return res.status(404).json({ error: 'Ese negocio no tiene una cuenta de administrador.' });

    const token = signToken(adminUser);
    res.json({ token, user: safeUser(adminUser), slug: business.slug });
  } catch (err) {
    console.error('POST /api/superadmin/businesses/:slug/enter', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/staff — pública, solo id+nombre. La necesita el booking (con o
// sin sesión) para dejar elegir empleado si Settings.enableStaffSelection
// está prendido — sin esto habría que exponer todo /api/users (que trae
// email/phone/capacity) o negarle a un cliente sin cuenta la posibilidad de
// elegir. Si el flag está apagado, regresa vacío — no expone empleados por
// gusto en negocios que no usan esta función.
app.get('/api/staff', async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    if (!settings?.enableStaffSelection) return res.json([]);
    const staff = await prisma.user.findMany({
      where: { role: 'empleado' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(staff);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

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
      include: { pets: true, membershipPlan: true },
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
    const { password, role, securityAnswer, ...data } = req.body; // no permitir cambiar password/role aquí
    // Permite configurar/actualizar la pregunta de seguridad desde el perfil
    // (necesario para cuentas creadas antes de que existiera este campo).
    if (securityAnswer) {
      data.securityAnswerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);
    }
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

    const business = await prismaRaw.business.findUnique({ where: { id: req.businessId } });
    let userData;

    if (business?.authProvider === 'aegis') {
      if (!data.email) return res.status(400).json({ error: 'El correo es obligatorio' });
      const { data: aegisUser, error: aegisErr } = await aegisClient.adminCreateUser(data.email, validRole);
      if (aegisErr) {
        const { body, status } = aegisErr;
        console.warn('AEGIS adminCreateUser (staff) falló:', status, body);
        if (status === 409) return res.status(409).json({ error: 'Email ya registrado' });
        return res.status(502).json({ error: 'No se pudo crear el usuario en AEGIS' });
      }
      userData = { ...data, aegisUserId: String(aegisUser.id), role: validRole };
      const user = await prisma.user.create({ data: userData });
      return res.status(201).json({ ...safeUser(user), tempPassword: aegisUser.tempPassword });
    }

    const hash = await bcrypt.hash(password || 'perrucho123', 10);
    userData = { ...data, password: hash, role: validRole };
    const user = await prisma.user.create({ data: userData });
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
    // Solo admin/empleado pueden fijar la contraseña de un cliente aquí — es
    // el respaldo para clientes que aún no configuraron su pregunta de
    // seguridad y por lo tanto no pueden usar "Olvidé mi contraseña" solos.
    if (password && ['administrador', 'empleado'].includes(req.user.role)) {
      data.password = await bcrypt.hash(password, 10);
    }
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
  if (data.durationMinutes !== undefined) data.durationMinutes = parseInt(data.durationMinutes) || 45;
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
// MEMBERSHIP PLANS (giro gimnasio) — catálogo, mismo patrón CRUD que Service.
// La membresía ACTUAL de un cliente vive en User (ver más abajo, PATCH
// /api/users/:id/membership) — sin tabla de historial de renovaciones.
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/membership-plans', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const plans = await prisma.membershipPlan.findMany({ orderBy: { id: 'asc' } });
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

const normalizeMembershipPlanBody = (body) => ({
  ...body,
  price: parseInt(body.price) || 0,
  durationDays: parseInt(body.durationDays) || 30,
  classesLimit: body.classesLimit === '' || body.classesLimit == null ? null : parseInt(body.classesLimit),
});

app.post('/api/membership-plans', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const plan = await prisma.membershipPlan.create({ data: normalizeMembershipPlanBody(req.body) });
    res.status(201).json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.put('/api/membership-plans/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    const plan = await prisma.membershipPlan.update({
      where: { id: parseInt(req.params.id) },
      data: normalizeMembershipPlanBody(req.body),
    });
    res.json(plan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.delete('/api/membership-plans/:id', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    // Un cliente con este plan asignado se queda sin plan (no se bloquea el
    // borrado) — su membershipExpiresAt actual se conserva tal cual, así
    // que sigue viéndose vigente/vencida hasta que el admin le asigne otra.
    await prisma.user.updateMany({ where: { membershipPlanId: parseInt(req.params.id) }, data: { membershipPlanId: null } });
    await prisma.membershipPlan.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PATCH /api/users/:id/membership — asignar o renovar la membresía de un
// cliente. membershipPlanId: null cancela (limpia todo). Con un plan válido,
// mueve la vigencia planDurationDays hacia adelante DESDE HOY — es una
// renovación completa, no una extensión de lo que quedaba (simple a
// propósito: sin tabla de historial, ver spec).
app.patch('/api/users/:id/membership', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { membershipPlanId } = req.body;
    if (!membershipPlanId) {
      const user = await prisma.user.update({
        where: { id: parseInt(req.params.id) },
        data: { membershipPlanId: null, membershipExpiresAt: null, membershipClassesUsed: null },
      });
      return res.json(safeUser(user));
    }
    const plan = await prisma.membershipPlan.findUnique({ where: { id: parseInt(membershipPlanId) } });
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { membershipPlanId: plan.id, membershipExpiresAt: expiresAt, membershipClassesUsed: 0 },
      include: { membershipPlan: true },
    });
    res.json(safeUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/users/:id/clinical-notes — agrega una nota al expediente del
// cliente (giro clínica, Settings.enableClientNotes). Mismo patrón que
// Pet.history: se hace push a un JSON array en la propia fila, sin tabla de
// notas aparte — cada entrada queda con quién la escribió y cuándo.
app.post('/api/users/:id/clinical-notes', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { note, appointmentId } = req.body;
    if (!note) return res.status(400).json({ error: 'La nota no puede estar vacía' });
    const [client, author] = await Promise.all([
      prisma.user.findUnique({ where: { id: parseInt(req.params.id) } }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }),
    ]);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    const entry = {
      date: new Date().toISOString(),
      appointmentId: appointmentId ? parseInt(appointmentId) : null,
      authorName: author?.name || req.user.email,
      note,
    };
    const history = Array.isArray(client.clinicalHistory) ? client.clinicalHistory : [];
    const user = await prisma.user.update({
      where: { id: client.id },
      data: { clinicalHistory: [...history, entry] },
    });
    res.status(201).json(safeUser(user));
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
  // membershipPlanId/membershipExpiresAt: para que el popup de detalle de
  // una cita de clase (Service.isClass) pueda mostrar vigente/vencida sin
  // una consulta aparte (giro gimnasio, ver Settings.enableMemberships).
  client: { select: { id: true, name: true, email: true, phone: true, membershipPlanId: true, membershipExpiresAt: true } },
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

// Antes esto era una lista de horarios fija (SHOP_TIME_SLOTS) compartida por
// TODOS los negocios, con un paso de 45 min sin importar el servicio. Ahora
// se genera por negocio (Settings.businessHours) y por día de la semana —
// un día marcado como cerrado no ofrece ningún slot — y el paso entre slots
// es la duración real del servicio (Service.durationMinutes), no un valor fijo.
function computeSlotsForDate(date, businessHours, durationMinutes) {
  const dow = new Date(`${date}T12:00:00`).getDay(); // mediodía evita corrimiento de día por TZ
  const dayCfg = (businessHours || []).find(d => d.day === dow);
  if (!dayCfg || !dayCfg.open) return [];

  const startMin = toMinutes(dayCfg.start);
  const endMin = toMinutes(dayCfg.end);
  const step = Math.max(5, Number(durationMinutes) || 45);
  const slots = [];
  for (let m = startMin; m + step <= endMin; m += step) {
    const h = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${h}:${mm}`);
  }
  return slots;
}

// employeeId opcional: si el cliente eligió a alguien al reservar (giro con
// Settings.enableStaffSelection), la disponibilidad ya no es "capacidad
// agregada de todos los empleados" — es "¿ESTE empleado tiene algo a esa
// hora?" (capacidad 1, una persona a la vez), aunque otro empleado esté libre.
async function getFullSlotsForDate(date, allSlots, excludeApptId = null, employeeId = null) {
  const [appointments, employees] = await Promise.all([
    prisma.appointment.findMany({
      where: { date, status: { notIn: ['Cancelada', 'Completada'] } },
      select: { id: true, time: true, employeeId: true },
    }),
    prisma.user.findMany({ where: { role: 'empleado' }, select: { capacity: true } }),
  ]);

  if (employeeId) {
    const bookedMinutes = appointments
      .filter(a => a.time && a.id !== excludeApptId && a.employeeId === employeeId)
      .map(a => toMinutes(a.time));
    return allSlots.filter(slot => {
      const slotMin = toMinutes(slot);
      return bookedMinutes.some(m => Math.abs(m - slotMin) < 60);
    });
  }

  const totalCapacity = employees.reduce((sum, e) => sum + (Number(e.capacity) || 1), 0) || 1;
  const bookedMinutes = appointments
    .filter(a => a.time && a.id !== excludeApptId)
    .map(a => toMinutes(a.time));

  return allSlots.filter(slot => {
    const slotMin = toMinutes(slot);
    const conflicts = bookedMinutes.filter(m => Math.abs(m - slotMin) < 60).length;
    return conflicts >= totalCapacity;
  });
}

// GET /api/appointments/availability?date=YYYY-MM-DD&serviceId=123 — pública
// (la necesita el booking express, que corre sin sesión). serviceId es
// opcional: si no llega (booking express no elige servicio), se usa la
// duración por defecto de 45 min. Devuelve el horario completo del día
// (slots) y cuáles ya están llenos (fullSlots) — el frontend ya no trae su
// propia copia hardcodeada del horario.
app.get('/api/appointments/availability', async (req, res) => {
  try {
    const { date, serviceId, employeeId } = req.query;
    if (!date) return res.status(400).json({ error: 'Fecha requerida' });
    const settings = await prisma.settings.findFirst();
    const businessHours = settings?.businessHours || DEFAULT_BUSINESS_HOURS;
    let durationMinutes = 45;
    if (serviceId) {
      const svc = await prisma.service.findUnique({ where: { id: parseInt(serviceId) }, select: { durationMinutes: true } });
      if (svc) durationMinutes = svc.durationMinutes;
    }
    const slots = computeSlotsForDate(date, businessHours, durationMinutes);
    const fullSlots = await getFullSlotsForDate(date, slots, null, employeeId ? parseInt(employeeId) : null);
    res.json({ slots, fullSlots });
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

// Antes solo se validaba choque de capacidad (getFullSlotsForDate) — nada
// impedía que una cita se guardara con una hora fuera del horario del
// negocio, o en un día marcado como cerrado (ni desde el booking público ni
// desde el formulario manual del admin). Se usa tanto en creación como al
// asignar/editar la hora de una cita existente.
async function validateAppointmentTime(date, time, serviceId, excludeApptId = null, employeeId = null) {
  const settings = await prisma.settings.findFirst();
  const businessHours = settings?.businessHours || DEFAULT_BUSINESS_HOURS;
  let durationMinutes = 45;
  if (serviceId) {
    const svc = await prisma.service.findUnique({ where: { id: parseInt(serviceId) }, select: { durationMinutes: true } });
    if (svc) durationMinutes = svc.durationMinutes;
  }
  const slots = computeSlotsForDate(date, businessHours, durationMinutes);
  if (!slots.includes(time)) {
    return { ok: false, error: slots.length === 0 ? 'El negocio no atiende ese día.' : 'Ese horario está fuera del horario de atención.' };
  }
  const fullSlots = await getFullSlotsForDate(date, slots, excludeApptId, employeeId);
  if (fullSlots.includes(time)) {
    return { ok: false, error: employeeId ? 'Ese empleado ya no está disponible a esa hora. Elige otro horario o empleado.' : 'Ese horario ya no está disponible. Elige otro.' };
  }
  return { ok: true };
}

// Los selects de <form> siempre entregan string — sin esto, Prisma rechaza
// la escritura con "Invalid value provided. Expected Int or Null, provided
// String." Bug real, pre-existente: el formulario "Nueva cita" del admin
// mandaba petId/serviceId/clientId/employeeId tal cual del <select> y nunca
// funcionó con un servicio elegido (mismo problema que ya se había
// resuelto para otros formularios — ownerId en pets, price/stock en
// products — sin arreglar aquí).
const ID_FIELDS = ['petId', 'serviceId', 'clientId', 'employeeId'];
// Whitelist explícito de columnas reales de Appointment (ver
// prisma/schema.prisma) — varios formularios del frontend arman su payload
// agregando campos "de más" (serviceName/petName para preview, assignedTo
// en vez de employeeId) que Prisma rechaza con PrismaClientValidationError.
// Ya se había resuelto este bug puntualmente 2 veces sin arreglar la causa
// raíz; filtrar aquí lo cierra para cualquier llamador, presente o futuro.
const APPOINTMENT_FIELDS = new Set([
  'clientId', 'petId', 'serviceId', 'employeeId', 'date', 'time',
  'status', 'finalPrice', 'notes', 'guestName', 'guestPhone',
]);
const normalizeAppointmentIds = (data) => {
  const out = {};
  for (const key of Object.keys(data)) {
    if (APPOINTMENT_FIELDS.has(key)) out[key] = data[key];
  }
  for (const f of ID_FIELDS) {
    if (out[f] === '' || out[f] === undefined) delete out[f];
    else if (out[f] !== null) out[f] = parseInt(out[f]);
  }
  return out;
};

app.post('/api/appointments', publicWriteLimiter, async (req, res) => {
  // Pública para booking express (clientes sin sesión) Y para el flujo de
  // reserva con cuenta (ServiceModal): ese flujo solo pide el DÍA a propósito
  // — el groomer asigna la hora después desde su calendario — así que time
  // llega como '' intencionalmente y NO debe exigirse aquí.
  try {
    const { extras, ...rawData } = req.body;
    const data = normalizeAppointmentIds(rawData);
    if (!data.date)
      return res.status(400).json({ error: 'Fecha requerida' });
    // Revalidar disponibilidad en el servidor (evita que dos personas
    // reserven el mismo horario a la vez, o que llegue una hora fuera del
    // horario del negocio — el frontend ya filtra esto, pero esto cierra
    // la condición de carrera y cualquier intento de saltarse el frontend).
    if (data.time) {
      const check = await validateAppointmentTime(data.date, data.time, data.serviceId, null, data.employeeId || null);
      if (!check.ok) return res.status(409).json({ error: check.error });
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
  const { extras, ...rawData } = body;
  const data = normalizeAppointmentIds(rawData);
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

// Se usa desde PUT y PATCH: si la actualización trae `time` (ej. el admin
// asigna hora a una cita "Pendiente" sin hora — AssignTimePicker), valida
// horario de negocio + capacidad igual que en la creación. `serviceId`
// puede no venir en el body de esta actualización puntual, así que cae al
// de la cita existente.
const validateTimeOnUpdate = async (id, data) => {
  if (!data.time) return null;
  const existing = await prisma.appointment.findUnique({ where: { id }, select: { date: true, serviceId: true, employeeId: true } });
  if (!existing) return null;
  const date = data.date || existing.date;
  const serviceId = data.serviceId || existing.serviceId;
  const employeeId = data.employeeId !== undefined ? data.employeeId : existing.employeeId;
  const check = await validateAppointmentTime(date, data.time, serviceId, id, employeeId);
  return check.ok ? null : check.error;
};

app.put('/api/appointments/:id', verifyToken, async (req, res) => {
  try {
    if (!(await assertAppointmentOwnership(req, res))) return;
    const { data } = normalizeAppointmentBody(req.body);
    const timeError = await validateTimeOnUpdate(parseInt(req.params.id), data);
    if (timeError) return res.status(409).json({ error: timeError });
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
    const timeError = await validateTimeOnUpdate(parseInt(req.params.id), data);
    if (timeError) return res.status(409).json({ error: timeError });
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

// El descuento de stock vivía en el cliente (leer estado local, calcular,
// PUT completo) — no atómico: dos ventas concurrentes del mismo producto
// podían leer el mismo stock de partida y una pisar el descuento de la otra,
// y si la venta se creaba pero el PUT de stock fallaba después, quedaba una
// venta registrada sin que el inventario bajara. Ahora todo el descuento
// vive en la misma transacción que crea la venta: si el stock no alcanza,
// la venta completa se revierte (409) en vez de quedar a medias.
app.post('/api/sales', verifyToken, requireRole('administrador', 'empleado'), async (req, res) => {
  try {
    const { items, ...data } = req.body;
    const sale = await prisma.$transaction(async (tx) => {
      const createdSale = await tx.sale.create({
        data: {
          ...data,
          items: items ? { create: items } : undefined,
        },
        include: saleInclude,
      });

      for (const item of items || []) {
        if (!item.productId) continue;
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;

        if (item.variantName) {
          const variants = product.variants || [];
          const idx = variants.findIndex((v) => v.name === item.variantName);
          if (idx === -1) continue;
          if (variants[idx].stock < item.quantity) {
            throw Object.assign(
              new Error(`Stock insuficiente para "${product.name} — ${item.variantName}"`),
              { status: 409 }
            );
          }
          const nextVariants = variants.map((v, i) =>
            i === idx ? { ...v, stock: v.stock - item.quantity } : v
          );
          await tx.product.update({ where: { id: item.productId }, data: { variants: nextVariants } });
        } else {
          const result = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (result.count === 0) {
            throw Object.assign(
              new Error(`Stock insuficiente para "${product.name}"`),
              { status: 409 }
            );
          }
        }
      }

      return createdSale;
    });
    res.status(201).json(sale);
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message });
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
// Multi-tenant: Settings ya no es un singleton fijo a id=1 (ver Fase 1) — se
// busca por businessId (inyectado automáticamente por tenantClient vía
// findFirst), no por un id fijo, para que funcione igual para Taylor's que
// para cualquier negocio nuevo. `giro` viaja aparte porque vive en Business,
// no en Settings — el frontend lo usa para elegir ruleset de íconos y copy
// por defecto (ver src/config/giroPresets.js).
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await prisma.settings.findFirst();
    const business = await prismaRaw.business.findUnique({ where: { id: req.businessId } });
    res.json({
      ...settings,
      giro: business?.giro || 'mascotas',
      // El frontend lo usa para ocultar los campos de contraseña/pregunta de
      // seguridad en el registro cuando AEGIS es quien genera la contraseña.
      authProvider: business?.authProvider || 'local',
      // Slug real del negocio — necesario en páginas sin slug en la URL
      // (ej. /perfil, que es una ruta protegida sin prefijo) para que el
      // Navbar arme los links públicos correctos en vez de adivinar el slug
      // a partir del path (bug real: tomaba "perfil" como si fuera un slug).
      slug: business?.slug || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/settings — solo admin
app.put('/api/settings', verifyToken, requireRole('administrador'), async (req, res) => {
  try {
    // GET /api/settings devuelve el registro de Settings mezclado con campos
    // que en realidad viven en Business (giro, authProvider, slug) — el
    // frontend guarda esa respuesta completa en su estado y la reenvía tal
    // cual al guardar. Sin filtrarlos aquí, Prisma tronaba con "Unknown
    // argument businessId" (authProvider/slug/id/businessId no son columnas
    // editables de Settings) y Personalización no podía guardar NADA.
    const { giro, authProvider, slug, id, businessId, ...settingsBody } = req.body;
    const existing = await prisma.settings.findFirst();
    const settings = existing
      ? await prisma.settings.update({ where: { id: existing.id }, data: settingsBody })
      : await prisma.settings.create({ data: settingsBody });
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