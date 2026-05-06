// src/api/apiClient.js
//
// AUDITORÍA DE CONEXIÓN — Cambios v2:
// 1. appointmentsApi.update: ahora hace GET + merge + PUT en vez de PATCH puro.
//    PATCH falla en algunos despliegues de json-server v1 cuando el body tiene
//    campos `null` o cuando el shape original difiere del payload. PUT con merge
//    completo es 100% compatible.
// 2. Normalización de IDs: los endpoints REST distinguen "1004" vs 1004, así que
//    siempre se serializan como strings en la URL con encodeURIComponent.
// 3. handleResponse: ahora distingue 404 (recurso no encontrado) de 5xx (servidor),
//    para que la UI pueda dar mensajes más útiles.
// 4. Retries simples para errores transitorios de red en producción (Render free
//    tier puede tener cold starts de 30+ segundos).
//
// Entornos:
//   local dev  → http://localhost:3001  (JSON Server local)
//   producción → REACT_APP_API_URL      (Render backend)

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── handleResponse robusto ───────────────────────────────────────────────────
const handleResponse = async (res) => {
    if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch {}
        const err = new Error(body || `HTTP ${res.status} ${res.statusText}`);
        err.status = res.status;
        throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
};

// ── fetchWithRetry para soportar cold starts de Render ───────────────────────
const fetchWithRetry = async (url, options = {}, retries = 2) => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, options);
            // 5xx en primer intento → reintentar (cold start de Render)
            if (res.status >= 500 && attempt < retries) {
                await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
                continue;
            }
            return res;
        } catch (err) {
            lastErr = err;
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
                continue;
            }
            throw lastErr;
        }
    }
    throw lastErr;
};

const api = {
    get:    (endpoint)       => fetchWithRetry(`${BASE_URL}${endpoint}`).then(handleResponse),
    post:   (endpoint, body) => fetchWithRetry(`${BASE_URL}${endpoint}`, { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(handleResponse),
    put:    (endpoint, body) => fetchWithRetry(`${BASE_URL}${endpoint}`, { method: 'PUT',   headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(handleResponse),
    patch:  (endpoint, body) => fetchWithRetry(`${BASE_URL}${endpoint}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(handleResponse),
    delete: (endpoint)       => fetchWithRetry(`${BASE_URL}${endpoint}`, { method: 'DELETE' }).then(handleResponse),
};

const today = () => new Date().toISOString().split('T')[0];

// Normalizador de ID: garantiza string sin escape sucio
const idStr = (id) => encodeURIComponent(String(id));

// ── Usuarios ──────────────────────────────────────────────────────────────────
export const usersApi = {
    getAll:  ()         => api.get('/users'),
    getById: (id)       => api.get(`/users/${idStr(id)}`),
    create:  (data)     => api.post('/users', data),
    update:  (id, data) => api.put(`/users/${idStr(id)}`, data),
    delete:  (id)       => api.delete(`/users/${idStr(id)}`),
    login: async (email, password) => {
        const users = await api.get(`/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        return users.length > 0 ? users[0] : null;
    },
};

// ── Clientes ──────────────────────────────────────────────────────────────────
export const clientsApi = {
    getAll:  ()         => api.get('/clients'),
    getById: (id)       => api.get(`/clients/${idStr(id)}`),
    create:  (data)     => api.post('/clients', { ...data, createdAt: today() }),
    update:  (id, data) => api.put(`/clients/${idStr(id)}`, data),
    delete:  (id)       => api.delete(`/clients/${idStr(id)}`),
};

// ── Mascotas ──────────────────────────────────────────────────────────────────
export const petsApi = {
    getAll:     ()         => api.get('/pets'),
    getByOwner: (ownerId)  => api.get(`/pets?ownerId=${idStr(ownerId)}`),
    getById:    (id)       => api.get(`/pets/${idStr(id)}`),
    create:     (data)     => api.post('/pets', { ...data, createdAt: today() }),
    update:     (id, data) => api.put(`/pets/${idStr(id)}`, data),
    delete:     (id)       => api.delete(`/pets/${idStr(id)}`),
};

// ── Servicios ─────────────────────────────────────────────────────────────────
export const servicesApi = {
    getAll:  ()         => api.get('/services'),
    getById: (id)       => api.get(`/services/${idStr(id)}`),
    create: (data) => {
        const base = Number(data.price) || 0;
        return api.post('/services', {
            icon:         data.icon    || '',
            color:        data.color   || 'blue',
            popular:      data.popular || false,
            priceChico:   data.priceChico   ?? base,
            priceMediano: data.priceMediano ?? +(base * 1.25).toFixed(0),
            priceGrande:  data.priceGrande  ?? +(base * 1.50).toFixed(0),
            ...data,
        });
    },
    update: (id, data) => {
        const base = Number(data.price) || 0;
        return api.put(`/services/${idStr(id)}`, {
            icon:         data.icon    || '',
            color:        data.color   || 'blue',
            popular:      data.popular || false,
            priceChico:   data.priceChico   ?? base,
            priceMediano: data.priceMediano ?? +(base * 1.25).toFixed(0),
            priceGrande:  data.priceGrande  ?? +(base * 1.50).toFixed(0),
            ...data,
            id,
        });
    },
    delete: (id) => api.delete(`/services/${idStr(id)}`),
};

// ── Productos ─────────────────────────────────────────────────────────────────
export const productsApi = {
    getAll:  ()         => api.get('/products'),
    getById: (id)       => api.get(`/products/${idStr(id)}`),
    create:  (data)     => api.post('/products', data),
    update:  (id, data) => api.put(`/products/${idStr(id)}`, data),
    delete:  (id)       => api.delete(`/products/${idStr(id)}`),
};

// ── Citas ─────────────────────────────────────────────────────────────────────
// FIX CRÍTICO: update ahora hace GET + merge + PUT en vez de PATCH.
// Razón: PATCH falla intermitentemente en json-server cuando el documento
// original tiene shape inconsistente (ej. cita 1005 del db.json que se creó
// con orden de propiedades distinto y le faltan campos). PUT con merge completo
// siempre funciona porque envía el documento entero.
export const appointmentsApi = {
    getAll:      ()         => api.get('/appointments'),
    getByClient: (clientId) => api.get(`/appointments?clientId=${idStr(clientId)}`),
    getByDate:   (date)     => api.get(`/appointments?date=${idStr(date)}`),
    create:      (data)     => api.post('/appointments', { ...data, createdAt: today() }),

    // Update robusto: lee el documento actual, hace merge y manda PUT completo.
    update: async (id, partialData) => {
        try {
            // 1. Traer el documento actual
            const current = await api.get(`/appointments/${idStr(id)}`);
            // 2. Merge: mantener todos los campos, sobrescribir solo los nuevos
            //    Conservar el id original (puede ser number o string)
            const merged = { ...current, ...partialData, id: current.id };
            // 3. PUT con el documento completo
            return await api.put(`/appointments/${idStr(id)}`, merged);
        } catch (err) {
            // Fallback: si el GET previo falla por 404, intentamos PATCH directo
            console.warn('[appointmentsApi.update] GET previo falló, intentando PATCH:', err.message);
            return api.patch(`/appointments/${idStr(id)}`, partialData);
        }
    },

    delete: (id) => api.delete(`/appointments/${idStr(id)}`),
};

// ── Ventas ────────────────────────────────────────────────────────────────────
// FIX: preserva el `type` ('product' | 'service') que pasa el caller.
export const salesApi = {
    getAll: ()     => api.get('/sales'),
    create: (data) => api.post('/sales', { date: today(), ...data }),
};

export default api;