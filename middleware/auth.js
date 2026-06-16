// middleware/auth.js
// Patrón idéntico a Booz Studio.
// Exporta tres funciones: verifyToken, requireRole, requireOwnerOrRole

const jwt = require('jsonwebtoken');

// ── verifyToken ───────────────────────────────────────────────────────────────
// Extrae el JWT del header Authorization: Bearer <token>
// Adjunta req.user = { id, email, role } si es válido
// Retorna 401 si falta o es inválido
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ── requireRole ───────────────────────────────────────────────────────────────
// Verifica que req.user.role esté en la lista de roles permitidos
// Uso: requireRole('administrador') o requireRole('empleado', 'administrador')
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    }
    next();
  };
};

// ── requireOwnerOrRole ────────────────────────────────────────────────────────
// Permite acceso si req.user.id === parseInt(req.params.id) (dueño del recurso)
// O si req.user.role está en los roles permitidos
// Uso: requireOwnerOrRole('administrador')
const requireOwnerOrRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const isOwner = req.user.id === parseInt(req.params.id);
    const hasRole = roles.includes(req.user.role);
    if (!isOwner && !hasRole) {
      return res.status(403).json({ error: 'No tienes permiso para este recurso' });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, requireOwnerOrRole };