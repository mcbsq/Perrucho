// api/lib/aegisClient.js
//
// Puerto a JS de core/aegis_client.py (SistemaEmpleados) — cliente HTTP hacia
// AEGIS. Centraliza URLs, cabeceras y manejo de errores de red. Cada función
// retorna { data, error } — error es { body, status } si algo falla, para
// que el caller decida el mensaje al cliente sin tener que parsear la
// respuesta de fetch en cada sitio.
const { getAegisSettings } = require('./aegisConfig');

const authHeaders = (accessToken) => {
  const s = getAegisSettings();
  return {
    'X-Tenant-Id': s.tenantId,
    'X-App-Id': s.appId,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
};

const adminHeaders = () => {
  const s = getAegisSettings();
  return {
    'X-Tenant-Id': s.tenantId,
    'X-App-Id': s.appId,
    'Authorization': `ApiKey ${s.apiKey}`,
    'Content-Type': 'application/json',
  };
};

const parseBody = async (res) => {
  try { return await res.json(); } catch { return { detail: res.statusText }; }
};

const doFetch = async (url, options, timeout) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
};

// POST /v1/auth/login — valida credenciales contra AEGIS. Tenant/app son
// estáticos (un solo tenant de AEGIS compartido por todo Perrucho — ver
// aegisConfig.js), a diferencia de SistemaEmpleados no hace falta
// resolve-tenant dinámico.
const passwordLogin = async (identifier, password) => {
  const s = getAegisSettings();
  try {
    const r = await doFetch(`${s.baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'X-Tenant-Id': s.tenantId, 'X-App-Id': s.appId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    }, s.timeout);
    const body = await parseBody(r);
    if (r.ok) return { data: body, error: null };
    return { data: null, error: { body, status: r.status } };
  } catch (e) {
    console.error('AEGIS passwordLogin:', e.message);
    return { data: null, error: { body: { error: 'Servicio de autenticación no disponible' }, status: 503 } };
  }
};

// GET /v1/me — identidad canónica (id, email) del usuario ya autenticado.
const getMe = async (accessToken) => {
  const s = getAegisSettings();
  try {
    const r = await doFetch(`${s.baseUrl}/v1/me`, { headers: authHeaders(accessToken) }, s.timeout);
    const body = await parseBody(r);
    if (r.ok) return { data: body, error: null };
    return { data: null, error: { body, status: r.status } };
  } catch (e) {
    console.error('AEGIS getMe:', e.message);
    return { data: null, error: { body: { error: 'Servicio de autenticación no disponible' }, status: 503 } };
  }
};

// POST /v1/admin/users — crea la identidad en AEGIS. AEGIS genera la
// contraseña temporal (no acepta una elegida por el caller); el admin/el
// propio cliente debe entregarla/guardarla y cambiarla en el primer login.
const adminCreateUser = async (email, role) => {
  const s = getAegisSettings();
  if (!s.adminEnabled) return { data: null, error: { body: { error: 'AEGIS_API_KEY no configurada' }, status: 503 } };

  try {
    const r = await doFetch(`${s.baseUrl}/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        is_active: true,
        must_change_password: true,
        temp_password_mode: 'generate',
        return_temp_password: true,
        app_permissions: { [s.appId]: { scopes: ['users:read'], roles: [role] } },
      }),
    }, s.timeout);
    const body = await parseBody(r);
    if (r.ok) {
      const user = body.user || {};
      return { data: { id: user.id, tempPassword: body.temp_password, user }, error: null };
    }
    return { data: null, error: { body, status: r.status } };
  } catch (e) {
    console.error('AEGIS adminCreateUser:', e.message);
    return { data: null, error: { body: { error: 'AEGIS admin no disponible' }, status: 503 } };
  }
};

// POST /v1/admin/users/{id}/reset-password — "olvidé mi contraseña" del lado
// admin: genera una nueva temporal, el usuario la cambia en su próximo login.
const adminResetPassword = async (aegisUserId) => {
  const s = getAegisSettings();
  if (!s.adminEnabled) return { data: null, error: { body: { error: 'AEGIS_API_KEY no configurada' }, status: 503 } };

  try {
    const r = await doFetch(`${s.baseUrl}/v1/admin/users/${aegisUserId}/reset-password`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ mode: 'temp_password', return_temp_password: true }),
    }, s.timeout);
    const body = await parseBody(r);
    if (r.ok) return { data: { tempPassword: body.temp_password }, error: null };
    return { data: null, error: { body, status: r.status } };
  } catch (e) {
    console.error('AEGIS adminResetPassword:', e.message);
    return { data: null, error: { body: { error: 'AEGIS admin no disponible' }, status: 503 } };
  }
};

// PATCH /v1/admin/users/{id} — desactiva la identidad en vez de borrarla, así
// no queda una cuenta huérfana que siga autenticando en otro lado.
const adminSetActive = async (aegisUserId, isActive) => {
  const s = getAegisSettings();
  if (!s.adminEnabled) return { error: { body: { error: 'AEGIS_API_KEY no configurada' }, status: 503 } };

  try {
    const r = await doFetch(`${s.baseUrl}/v1/admin/users/${aegisUserId}`, {
      method: 'PATCH',
      headers: adminHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    }, s.timeout);
    if (r.ok) return { error: null };
    const body = await parseBody(r);
    return { error: { body, status: r.status } };
  } catch (e) {
    console.error('AEGIS adminSetActive:', e.message);
    return { error: { body: { error: 'AEGIS admin no disponible' }, status: 503 } };
  }
};

// POST /v1/auth/change-password — autoservicio: primero re-login con la
// contraseña actual (para obtener un token fresco), luego cambia. Así el
// caller nunca necesita guardar el access_token de una sesión de AEGIS por
// su cuenta — solo current/new password, igual que un cambio de contraseña
// normal.
const changePassword = async (identifier, currentPassword, newPassword) => {
  const { data: tokens, error: loginErr } = await passwordLogin(identifier, currentPassword);
  if (loginErr) return { error: loginErr };

  const s = getAegisSettings();
  try {
    const r = await doFetch(`${s.baseUrl}/v1/auth/change-password`, {
      method: 'POST',
      headers: authHeaders(tokens.access_token),
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }, s.timeout);
    if (r.ok) return { error: null };
    const body = await parseBody(r);
    return { error: { body, status: r.status } };
  } catch (e) {
    console.error('AEGIS changePassword:', e.message);
    return { error: { body: { error: 'Servicio de autenticación no disponible' }, status: 503 } };
  }
};

module.exports = { passwordLogin, getMe, adminCreateUser, adminResetPassword, adminSetActive, changePassword };
