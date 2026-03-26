// src/contexts/DataContext.jsx
// DataContext migrado a JSON Server.
// Mantiene exactamente la misma API que usaban los componentes
// (services, products, clients, pets, sales + funciones CRUD)
// para que no tengas que tocar ningún componente existente.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  servicesApi,
  productsApi,
  clientsApi,
  petsApi,
  salesApi,
} from '../api/apiClient';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [services,   setServices]   = useState([]);
  const [products,   setProducts]   = useState([]);
  const [clients,    setClients]    = useState([]);
  const [pets,       setPets]       = useState([]);
  const [sales,      setSales]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // ── Carga inicial ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, c, pe, sa] = await Promise.all([
        servicesApi.getAll(),
        productsApi.getAll(),
        clientsApi.getAll(),
        petsApi.getAll(),
        salesApi.getAll(),
      ]);
      setServices(s);
      setProducts(p);
      setClients(c);
      setPets(pe);
      setSales(sa);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudo conectar con el servidor. ¿Está corriendo JSON Server en el puerto 3001?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── SERVICES ─────────────────────────────────────────────────────────────
  const addService = async (s) => {
    const created = await servicesApi.create(s);
    setServices(prev => [...prev, created]);
    return created;
  };

  const updateService = async (id, updated) => {
    const saved = await servicesApi.update(id, { ...updated, id });
    setServices(prev => prev.map(s => s.id === id ? saved : s));
    return saved;
  };

  const deleteService = async (id) => {
    await servicesApi.delete(id);
    setServices(prev => prev.filter(s => s.id !== id));
  };

  // ── PRODUCTS ─────────────────────────────────────────────────────────────
  const addProduct = async (p) => {
    const created = await productsApi.create(p);
    setProducts(prev => [...prev, created]);
    return created;
  };

  const updateProduct = async (id, updated) => {
    const saved = await productsApi.update(id, { ...updated, id });
    setProducts(prev => prev.map(p => p.id === id ? saved : p));
    return saved;
  };

  const deleteProduct = async (id) => {
    await productsApi.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // ── CLIENTS ──────────────────────────────────────────────────────────────
  const addClient = async (c) => {
    const created = await clientsApi.create(c);
    setClients(prev => [...prev, created]);
    return created;
  };

  const updateClient = async (id, updated) => {
    const saved = await clientsApi.update(id, { ...updated, id });
    setClients(prev => prev.map(c => c.id === id ? saved : c));
    return saved;
  };

  const deleteClient = async (id) => {
    const hasPets = pets.some(p => String(p.ownerId) === String(id));
    if (hasPets) {
      alert('No puedes borrar un cliente con mascotas vinculadas.');
      return;
    }
    await clientsApi.delete(id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // ── PETS ─────────────────────────────────────────────────────────────────
  const addPet = async (p) => {
    const created = await petsApi.create(p);
    setPets(prev => [...prev, created]);
    return created;
  };

  const updatePet = async (id, updated) => {
    const saved = await petsApi.update(id, { ...updated, id });
    setPets(prev => prev.map(p => p.id === id ? saved : p));
    return saved;
  };

  const deletePet = async (id) => {
    await petsApi.delete(id);
    setPets(prev => prev.filter(p => p.id !== id));
  };

  // ── SALES ────────────────────────────────────────────────────────────────
  const addSale = async (item, price, clientId = null, type = 'service') => {
    const created = await salesApi.create({ item, price, clientId, type });
    setSales(prev => [created, ...prev]);
    return created;
  };

  return (
    <DataContext.Provider value={{
      // Estado
      services, products, clients, pets, sales,
      loading, error,
      // Acciones
      addService,    updateService,    deleteService,
      addProduct,    updateProduct,    deleteProduct,
      addClient,     updateClient,     deleteClient,
      addPet,        updatePet,        deletePet,
      addSale,
      // Utilidad
      reload: loadAll,
    }}>
      {children}
    </DataContext.Provider>
  );
};