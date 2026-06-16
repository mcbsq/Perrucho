// src/api/apiClient.js
//
// Cliente HTTP del frontend de Perrucho.
// Ahora apunta al backend Express+Prisma (en lugar de json-server).
//
// Local dev:   REACT_APP_API_URL no definida → http://localhost:3001/api
// Producción:  REACT_APP_API_URL=https://perrucho.vercel.app/api
//
// Cambio clave vs json-server:
//   - Todas las rutas llevan el prefijo /api/
//   - Las respuestas de appointments/clients incluyen objetos anidados (join)
//   - El token JWT se adjunta automáticamente en cada request

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// ── Token helpers ─────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('perrucho_token');

const authHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ── handleResponse robusto ────────────────────────────────────────────────────
const handleResponse = async (res) => {
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch {}
    let message = body;
    try { message = JSON.parse(body).error || body; } catch {}
    const err = new Error(message || `HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
};

// ── api base ──────────────────────────────────────────────────────────────────
const api = {
  get:    (endpoint) =>
    fetch(`${BASE_URL}${endpoint}`, { headers: authHeaders() }).then(handleResponse),

  post:   (endpoint, body) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  put:    (endpoint, body) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  patch:  (endpoint, body) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  delete: (endpoint) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleResponse),
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    api.post('/login', { email, password }),

  signup: (data) =>
    api.post('/signup', data),

  me: () =>
    api.get('/me'),
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll:  ()         => api.get('/users'),
  getById: (id)       => api.get(`/users/${encodeURIComponent(id)}`),
  create:  (data)     => api.post('/users', data),
  update:  (id, data) => api.put(`/users/${encodeURIComponent(id)}`, data),
  delete:  (id)       => api.delete(`/users/${encodeURIComponent(id)}`),

  // Login — devuelve { token, user }
  login: (email, password) => api.post('/login', { email, password }),
};

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTS
// ─────────────────────────────────────────────────────────────────────────────
export const clientsApi = {
  getAll:  ()         => api.get('/clients'),
  getById: (id)       => api.get(`/clients/${encodeURIComponent(id)}`),
  create:  (data)     => api.post('/clients', data),
  update:  (id, data) => api.put(`/clients/${encodeURIComponent(id)}`, data),
  delete:  (id)       => api.delete(`/clients/${encodeURIComponent(id)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// PETS
// ─────────────────────────────────────────────────────────────────────────────
export const petsApi = {
  getAll:       ()         => api.get('/pets'),
  getByOwner:   (ownerId)  => api.get(`/pets?ownerId=${encodeURIComponent(ownerId)}`),
  getById:      (id)       => api.get(`/pets/${encodeURIComponent(id)}`),
  create:       (data)     => api.post('/pets', data),
  update:       (id, data) => api.put(`/pets/${encodeURIComponent(id)}`, data),
  patch:        (id, data) => api.patch(`/pets/${encodeURIComponent(id)}`, data),
  delete:       (id)       => api.delete(`/pets/${encodeURIComponent(id)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────
export const servicesApi = {
  getAll:  ()         => api.get('/services'),
  getById: (id)       => api.get(`/services/${encodeURIComponent(id)}`),
  create:  (data)     => api.post('/services', data),
  update:  (id, data) => api.put(`/services/${encodeURIComponent(id)}`, data),
  delete:  (id)       => api.delete(`/services/${encodeURIComponent(id)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
export const productsApi = {
  getAll:  ()         => api.get('/products'),
  getById: (id)       => api.get(`/products/${encodeURIComponent(id)}`),
  create:  (data)     => api.post('/products', data),
  update:  (id, data) => api.put(`/products/${encodeURIComponent(id)}`, data),
  patch:   (id, data) => api.patch(`/products/${encodeURIComponent(id)}`, data),
  delete:  (id)       => api.delete(`/products/${encodeURIComponent(id)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────
export const appointmentsApi = {
  getAll:       (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/appointments${qs ? `?${qs}` : ''}`);
  },
  getById:      (id)          => api.get(`/appointments/${encodeURIComponent(id)}`),
  getByClient:  (clientId)    => api.get(`/appointments?clientId=${encodeURIComponent(clientId)}`),
  getByDate:    (date)        => api.get(`/appointments?date=${encodeURIComponent(date)}`),
  create:       (data)        => api.post('/appointments', data),
  update:       (id, data)    => api.put(`/appointments/${encodeURIComponent(id)}`, data),
  patch:        (id, data)    => api.patch(`/appointments/${encodeURIComponent(id)}`, data),
  delete:       (id)          => api.delete(`/appointments/${encodeURIComponent(id)}`),

  // Servicios adicionales
  addExtra:     (id, data)        => api.post(`/appointments/${encodeURIComponent(id)}/extras`, data),
  removeExtra:  (id, extraId)     => api.delete(`/appointments/${encodeURIComponent(id)}/extras/${encodeURIComponent(extraId)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// SALES
// ─────────────────────────────────────────────────────────────────────────────
export const salesApi = {
  getAll:  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/sales${qs ? `?${qs}` : ''}`);
  },
  getById: (id)          => api.get(`/sales/${encodeURIComponent(id)}`),
  create:  (data)        => api.post('/sales', data),
  update:  (id, data)    => api.put(`/sales/${encodeURIComponent(id)}`, data),
  patch:   (id, data)    => api.patch(`/sales/${encodeURIComponent(id)}`, data),
  delete:  (id)          => api.delete(`/sales/${encodeURIComponent(id)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
export const settingsApi = {
  get:    ()     => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;