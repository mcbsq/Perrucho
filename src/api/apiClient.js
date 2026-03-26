// src/api/apiClient.js
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const handleResponse = async (res) => {
    if (!res.ok) {
        const error = await res.text();
        throw new Error(error || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
};

const api = {
    get:    (endpoint)        => fetch(`${BASE_URL}${endpoint}`).then(handleResponse),
    post:   (endpoint, body)  => fetch(`${BASE_URL}${endpoint}`, { method:'POST',  headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(handleResponse),
    put:    (endpoint, body)  => fetch(`${BASE_URL}${endpoint}`, { method:'PUT',   headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(handleResponse),
    patch:  (endpoint, body)  => fetch(`${BASE_URL}${endpoint}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(handleResponse),
    delete: (endpoint)        => fetch(`${BASE_URL}${endpoint}`, { method:'DELETE' }).then(handleResponse),
};

// ── Usuarios ──────────────────────────────────────────────────────────────────
export const usersApi = {
    getAll:  ()          => api.get('/users'),
    getById: (id)        => api.get(`/users/${id}`),
    create:  (data)      => api.post('/users', data),
    update:  (id, data)  => api.put(`/users/${id}`, data),
    delete:  (id)        => api.delete(`/users/${id}`),
    login: async (email, password) => {
        const users = await api.get(`/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
        return users.length > 0 ? users[0] : null;
    },
};

// ── Clientes ──────────────────────────────────────────────────────────────────
export const clientsApi = {
    getAll:  ()          => api.get('/clients'),
    getById: (id)        => api.get(`/clients/${id}`),
    create:  (data)      => api.post('/clients', { ...data, createdAt: new Date().toISOString().split('T')[0] }),
    update:  (id, data)  => api.put(`/clients/${id}`, data),
    delete:  (id)        => api.delete(`/clients/${id}`),
};

// ── Mascotas ──────────────────────────────────────────────────────────────────
export const petsApi = {
    getAll:      ()         => api.get('/pets'),
    getByOwner:  (ownerId)  => api.get(`/pets?ownerId=${ownerId}`),
    getById:     (id)       => api.get(`/pets/${id}`),
    create:      (data)     => api.post('/pets', { ...data, createdAt: new Date().toISOString().split('T')[0] }),
    update:      (id, data) => api.put(`/pets/${id}`, data),
    delete:      (id)       => api.delete(`/pets/${id}`),
};

// ── Servicios — incluye precios por talla ─────────────────────────────────────
export const servicesApi = {
    getAll:  ()          => api.get('/services'),
    getById: (id)        => api.get(`/services/${id}`),
    // Al crear, si no vienen los precios por talla los calculamos desde price
    create: (data) => {
        const base = Number(data.price) || 0;
        return api.post('/services', {
            icon:         data.icon  || '',
            color:        data.color || 'blue',
            popular:      data.popular || false,
            priceChico:   data.priceChico   ?? base,
            priceMediano: data.priceMediano ?? +(base * 1.25).toFixed(0),
            priceGrande:  data.priceGrande  ?? +(base * 1.50).toFixed(0),
            ...data,
        });
    },
    update: (id, data) => {
        const base = Number(data.price) || 0;
        return api.put(`/services/${id}`, {
            icon:         data.icon  || '',
            color:        data.color || 'blue',
            popular:      data.popular || false,
            priceChico:   data.priceChico   ?? base,
            priceMediano: data.priceMediano ?? +(base * 1.25).toFixed(0),
            priceGrande:  data.priceGrande  ?? +(base * 1.50).toFixed(0),
            ...data,
            id,
        });
    },
    delete: (id) => api.delete(`/services/${id}`),
};

// ── Productos ─────────────────────────────────────────────────────────────────
export const productsApi = {
    getAll:  ()          => api.get('/products'),
    getById: (id)        => api.get(`/products/${id}`),
    create:  (data)      => api.post('/products', data),
    update:  (id, data)  => api.put(`/products/${id}`, data),
    delete:  (id)        => api.delete(`/products/${id}`),
};

// ── Citas ─────────────────────────────────────────────────────────────────────
export const appointmentsApi = {
    getAll:      ()         => api.get('/appointments'),
    getByClient: (clientId) => api.get(`/appointments?clientId=${clientId}`),
    getByDate:   (date)     => api.get(`/appointments?date=${date}`),
    create:      (data)     => api.post('/appointments', { ...data, createdAt: new Date().toISOString().split('T')[0] }),
    update:      (id, data) => api.patch(`/appointments/${id}`, data),
    delete:      (id)       => api.delete(`/appointments/${id}`),
};

// ── Ventas ────────────────────────────────────────────────────────────────────
export const salesApi = {
    getAll:  ()          => api.get('/sales'),
    create:  (data)      => api.post('/sales', { ...data, date: new Date().toLocaleDateString() }),
};

export default api;