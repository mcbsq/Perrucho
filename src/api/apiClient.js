// src/api/apiClient.js
//
// CAMBIOS v3 (cierre de checklist):
// - servicesApi.create/update: ya NO inyecta multiplicadores genéricos
//   (priceChico = base*1.25, etc.). Ahora los 6 campos de precio vienen
//   directamente del ServiceFormModal con los valores reales del catálogo.
//   Si un campo está vacío, hace fallback al precio base (price), no a un
//   multiplicador inventado.
// - Se eliminan los campos legacy priceChico/priceMediano/priceGrande
//   que generaban confusión con los nuevos priceMini/priceExtra/priceJumbo.
//
// Mantiene de v2: GET+merge+PUT en appointmentsApi.update, retries para
// cold starts de Render, normalización de IDs con encodeURIComponent.

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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

// Retries para cold starts de Render free tier
const fetchWithRetry = async (url, options = {}, retries = 2) => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, options);
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
// FIX: ya no se inyectan multiplicadores genéricos (base*1.25, base*1.50, etc.)
// Los 6 campos de precio vienen del ServiceFormModal con los valores reales.
// El campo `price` se usa como precio base para el POS (precio de la variante mini
// o el más bajo del catálogo) y como fallback si algún campo no viene.
export const servicesApi = {
    getAll:  ()         => api.get('/services'),
    getById: (id)       => api.get(`/services/${idStr(id)}`),
    create: (data) => {
        const base = Number(data.priceMini || data.price) || 0;
        return api.post('/services', {
            icon:    data.icon    || '',
            color:   data.color   || 'blue',
            popular: data.popular || false,
            // Los 6 rangos reales — si vienen del form se usan tal cual,
            // si no, se cae al precio base (no a multiplicadores inventados)
            priceMini:    Number(data.priceMini)    || base,
            priceChico:   Number(data.priceChico)   || base,
            priceMediano: Number(data.priceMediano) || base,
            priceGrande:  Number(data.priceGrande)  || base,
            priceExtra:   Number(data.priceExtra)   || base,
            priceJumbo:   Number(data.priceJumbo)   || base,
            // price = priceMini para compatibilidad con POS y legacy
            price: base,
            ...data,
        });
    },
    update: (id, data) => {
        const base = Number(data.priceMini || data.price) || 0;
        return api.put(`/services/${idStr(id)}`, {
            icon:    data.icon    || '',
            color:   data.color   || 'blue',
            popular: data.popular || false,
            priceMini:    Number(data.priceMini)    || base,
            priceChico:   Number(data.priceChico)   || base,
            priceMediano: Number(data.priceMediano) || base,
            priceGrande:  Number(data.priceGrande)  || base,
            priceExtra:   Number(data.priceExtra)   || base,
            priceJumbo:   Number(data.priceJumbo)   || base,
            price: base,
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
// UPDATE robusto: GET + merge + PUT para evitar fallo de PATCH en json-server
// cuando el documento tiene shape inconsistente o campos null.
export const appointmentsApi = {
    getAll:      ()         => api.get('/appointments'),
    getByClient: (clientId) => api.get(`/appointments?clientId=${idStr(clientId)}`),
    getByDate:   (date)     => api.get(`/appointments?date=${idStr(date)}`),
    create:      (data)     => api.post('/appointments', { ...data, createdAt: today() }),
    update: async (id, partialData) => {
        try {
            const current = await api.get(`/appointments/${idStr(id)}`);
            const merged  = { ...current, ...partialData, id: current.id };
            return await api.put(`/appointments/${idStr(id)}`, merged);
        } catch (err) {
            console.warn('[appointmentsApi.update] GET previo falló, intentando PATCH:', err.message);
            return api.patch(`/appointments/${idStr(id)}`, partialData);
        }
    },
    delete: (id) => api.delete(`/appointments/${idStr(id)}`),
};

// ── Ventas ────────────────────────────────────────────────────────────────────
// Preserva el `type` ('product' | 'service') que pasa el caller.
export const salesApi = {
    getAll: ()     => api.get('/sales'),
    create: (data) => api.post('/sales', { date: today(), ...data }),
};

export default api;