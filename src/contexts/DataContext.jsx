// src/contexts/DataContext.jsx
// FIX: separar carga pública (sin token) de carga privada (con token).
// services, products y settings son públicos — se cargan siempre.
// clients, pets, sales, appointments son privados — solo si hay token.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    servicesApi,
    productsApi,
    clientsApi,
    petsApi,
    salesApi,
    appointmentsApi,
    settingsApi,
} from '../api/apiClient';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

const hasToken = () => !!localStorage.getItem('perrucho_token');

export const DataProvider = ({ children }) => {
    const [services,     setServices]     = useState([]);
    const [products,     setProducts]     = useState([]);
    const [clients,      setClients]      = useState([]);
    const [pets,         setPets]         = useState([]);
    const [sales,        setSales]        = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [settings,     setSettings]     = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [error,        setError]        = useState(null);

    // ── Carga inicial ─────────────────────────────────────────────────────────
    // Público: services, products, settings (sin token requerido)
    // Privado: clients, pets, sales, appointments (solo si hay token)
    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Siempre cargar datos públicos
            const [s, p, st] = await Promise.all([
                servicesApi.getAll(),
                productsApi.getAll(),
                settingsApi.get(),
            ]);
            setServices(s);
            setProducts(p);
            setSettings(st);

            // Solo cargar datos privados si hay sesión activa
            if (hasToken()) {
                const session = localStorage.getItem('perrucho_session');
                let role = null;
                try { role = JSON.parse(session)?.role; } catch {}
                const isAdmin = role === 'administrador' || role === 'empleado';

                try {
                    if (isAdmin) {
                        // Admin y empleado cargan todos los datos
                        const [c, pe, sa, ap] = await Promise.all([
                            clientsApi.getAll(),
                            petsApi.getAll(),
                            salesApi.getAll(),
                            appointmentsApi.getAll(),
                        ]);
                        setClients(c);
                        setPets(pe);
                        setSales(sa);
                        setAppointments(ap);
                    } else {
                        // Cliente: solo carga appointments propias (ventas las carga Perfil.jsx directamente)
                        const ap = await appointmentsApi.getAll();
                        setAppointments(ap);
                    }
                } catch (privErr) {
                    console.warn('Error cargando datos privados:', privErr);
                    if (privErr.status === 401) {
                        localStorage.removeItem('perrucho_token');
                        localStorage.removeItem('perrucho_session');
                    }
                }
            }
        } catch (err) {
            console.error('Error cargando datos:', err);
            setError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // ── SERVICES ──────────────────────────────────────────────────────────────
    const addService = async (s) => {
        const created = await servicesApi.create(s);
        setServices(prev => [...prev, created]);
        return created;
    };
    const updateService = async (id, updated) => {
        const saved = await servicesApi.update(id, updated);
        setServices(prev => prev.map(s => s.id === id ? saved : s));
        return saved;
    };
    const deleteService = async (id) => {
        await servicesApi.delete(id);
        setServices(prev => prev.filter(s => s.id !== id));
    };

    // ── PRODUCTS ──────────────────────────────────────────────────────────────
    const addProduct = async (p) => {
        const created = await productsApi.create(p);
        setProducts(prev => [...prev, created]);
        return created;
    };
    const updateProduct = async (id, updated) => {
        const saved = await productsApi.update(id, updated);
        setProducts(prev => prev.map(p => p.id === id ? saved : p));
        return saved;
    };
    const deleteProduct = async (id) => {
        await productsApi.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id));
    };

    // ── CLIENTS ───────────────────────────────────────────────────────────────
    const addClient = async (c) => {
        const created = await clientsApi.create(c);
        setClients(prev => [...prev, created]);
        return created;
    };
    const updateClient = async (id, updated) => {
        const saved = await clientsApi.update(id, updated);
        setClients(prev => prev.map(c => c.id === id ? saved : c));
        return saved;
    };
    const deleteClient = async (id) => {
        await clientsApi.delete(id);
        setClients(prev => prev.filter(c => c.id !== id));
    };

    // ── PETS ──────────────────────────────────────────────────────────────────
    const addPet = async (p) => {
        const created = await petsApi.create(p);
        setPets(prev => [...prev, created]);
        return created;
    };
    const updatePet = async (id, updated) => {
        const saved = await petsApi.update(id, updated);
        setPets(prev => prev.map(p => p.id === id ? saved : p));
        return saved;
    };
    const deletePet = async (id) => {
        await petsApi.delete(id);
        setPets(prev => prev.filter(p => p.id !== id));
    };

    // ── APPOINTMENTS ──────────────────────────────────────────────────────────
    const addAppointment = async (data) => {
        const created = await appointmentsApi.create(data);
        setAppointments(prev => [...prev, created]);
        return created;
    };
    const updateAppointment = async (id, updated) => {
        const saved = await appointmentsApi.update(id, updated);
        setAppointments(prev => prev.map(a => a.id === id ? saved : a));
        return saved;
    };
    const patchAppointment = async (id, updated) => {
        const saved = await appointmentsApi.patch(id, updated);
        setAppointments(prev => prev.map(a => a.id === id ? saved : a));
        return saved;
    };
    const deleteAppointment = async (id) => {
        await appointmentsApi.delete(id);
        setAppointments(prev => prev.filter(a => a.id !== id));
    };

    // Servicios adicionales a una cita
    const addAppointmentExtra = async (appointmentId, data) => {
        const extra = await appointmentsApi.addExtra(appointmentId, data);
        // Recarga la cita completa para reflejar el extra
        const updated = await appointmentsApi.getById(appointmentId);
        setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a));
        return extra;
    };
    const removeAppointmentExtra = async (appointmentId, extraId) => {
        await appointmentsApi.removeExtra(appointmentId, extraId);
        const updated = await appointmentsApi.getById(appointmentId);
        setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a));
    };

    // ── SALES ─────────────────────────────────────────────────────────────────
    // Nuevo formato: recibe objeto completo con items[]
    // Ejemplo: addSale({ items: [{name, price, quantity}], total, clientId,
    //                     paymentMethod: 'efectivo', status: 'pagado', type: 'product' })
    const addSale = async (saleData) => {
        // Compatibilidad hacia atrás: si viene el formato viejo (item, price, clientId, type)
        // lo convertimos al nuevo formato
        if (typeof saleData === 'string' || (saleData && saleData.item)) {
            const legacy = saleData;
            saleData = {
                items: [{ name: legacy.item || saleData, price: legacy.price || 0, quantity: 1 }],
                total: legacy.price || 0,
                clientId: legacy.clientId || null,
                type: legacy.type || 'service',
                paymentMethod: 'efectivo',
                status: 'pagado',
            };
        }
        const created = await salesApi.create(saleData);
        setSales(prev => [...prev, created]);
        return created;
    };

    const updateSale = async (id, updated) => {
        const saved = await salesApi.update(id, updated);
        setSales(prev => prev.map(s => s.id === id ? saved : s));
        return saved;
    };

    const patchSale = async (id, updated) => {
        const saved = await salesApi.patch(id, updated);
        setSales(prev => prev.map(s => s.id === id ? saved : s));
        return saved;
    };

    // ── SETTINGS ──────────────────────────────────────────────────────────────
    const updateSettings = async (data) => {
        const saved = await settingsApi.update(data);
        setSettings(saved);
        return saved;
    };

    // ── Recargas parciales ────────────────────────────────────────────────────
    // Solo admin/empleado pueden ver todos los clientes y mascotas.
    // Si el usuario es cliente esta función no hace nada —
    // Perfil.jsx carga sus propios datos directamente.
    const reloadClientsAndPets = useCallback(async () => {
        const session = localStorage.getItem('perrucho_session');
        let role = null;
        try { role = JSON.parse(session)?.role; } catch {}
        if (!role || role === 'cliente') return;
        try {
            const [c, pe] = await Promise.all([
                clientsApi.getAll(),
                petsApi.getAll(),
            ]);
            setClients(c);
            setPets(pe);
        } catch (err) {
            console.error('Error recargando clientes/mascotas:', err);
        }
    }, []);

    const reloadAppointments = useCallback(async () => {
        try {
            const ap = await appointmentsApi.getAll();
            setAppointments(ap);
        } catch (err) {
            console.error('Error recargando citas:', err);
        }
    }, []);

    return (
        <DataContext.Provider value={{
            // Estado
            services, products, clients, pets, sales, appointments, settings,
            loading, error,

            // CRUD Services
            addService, updateService, deleteService,

            // CRUD Products
            addProduct, updateProduct, deleteProduct,

            // CRUD Clients
            addClient, updateClient, deleteClient,

            // CRUD Pets
            addPet, updatePet, deletePet,

            // CRUD Appointments
            addAppointment, updateAppointment, patchAppointment, deleteAppointment,
            addAppointmentExtra, removeAppointmentExtra,

            // CRUD Sales
            addSale, updateSale, patchSale,

            // Settings
            updateSettings,

            // Recargas
            reload: loadAll,
            reloadClientsAndPets,
            reloadAppointments,
        }}>
            {children}
        </DataContext.Provider>
    );
};