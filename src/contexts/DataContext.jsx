import React, { createContext, useContext, useState, useEffect } from 'react';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    // 1. Definimos los datos iniciales de prueba (Mock Data)
    const initialServices = [
        { id: 1, title: 'Estética Completa', description: 'Baño, corte y drenado.', price: 450, duration: '2h', category: 'Estética' },
        { id: 2, title: 'Consulta General', description: 'Revisión de rutina.', price: 350, duration: '45min', category: 'Veterinaria' }
    ];

    const initialProducts = [
        { id: 1, name: 'Shampoo Antipulgas', price: 180, stock: 15, category: 'Higiene' },
        { id: 2, name: 'Alimento Premium Adulto', price: 1200, stock: 3, category: 'Alimentos' }
    ];

    const initialClients = [
        { id: 101, name: 'Juan Pérez', phone: '555-0192', email: 'juan@ejemplo.com' },
        { id: 102, name: 'María García', phone: '555-0244', email: 'maria@ejemplo.com' }
    ];

    const initialPets = [
        { id: 201, petName: 'Firulais', breed: 'Golden Retriever', weight: '30', ownerId: '101', notes: 'Alergia al pollo' },
        { id: 202, petName: 'Luna', breed: 'Siamés', weight: '4', ownerId: '102', notes: 'Muy nerviosa' }
    ];

    const initialSales = [
        { id: 1001, date: '12/01/2026', item: 'Consulta Veterinaria', price: 350 },
        { id: 1002, date: '12/01/2026', item: 'Shampoo Antipulgas', price: 180 },
        { id: 1003, date: '13/01/2026', item: 'Estética Luna', price: 450 }
    ];

    // 2. Inicializamos los estados validando si el localStorage tiene datos REALES (no solo un array vacío)
    const [services, setServices] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('services'));
        return (saved && saved.length > 0) ? saved : initialServices;
    });

    const [products, setProducts] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('products'));
        return (saved && saved.length > 0) ? saved : initialProducts;
    });

    const [clients, setClients] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('clients'));
        return (saved && saved.length > 0) ? saved : initialClients;
    });

    const [pets, setPets] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('pets'));
        return (saved && saved.length > 0) ? saved : initialPets;
    });

    const [sales, setSales] = useState(() => {
        const saved = JSON.parse(localStorage.getItem('sales'));
        return (saved && saved.length > 0) ? saved : initialSales;
    });

    // 3. Sincronizar con LocalStorage cada vez que algo cambie
    useEffect(() => {
        localStorage.setItem('services', JSON.stringify(services));
        localStorage.setItem('products', JSON.stringify(products));
        localStorage.setItem('clients', JSON.stringify(clients));
        localStorage.setItem('pets', JSON.stringify(pets));
        localStorage.setItem('sales', JSON.stringify(sales));
    }, [services, products, clients, pets, sales]);

    // --- FUNCIONES CRUD ---
    const addService = (s) => setServices([...services, { ...s, id: Date.now() }]);
    const updateService = (id, updated) => setServices(services.map(s => s.id === id ? { ...updated, id } : s));
    const deleteService = (id) => setServices(services.filter(s => s.id !== id));

    const addProduct = (p) => setProducts([...products, { ...p, id: Date.now() }]);
    const updateProduct = (id, updated) => setProducts(products.map(p => p.id === id ? { ...updated, id } : p));
    const deleteProduct = (id) => setProducts(products.filter(p => p.id !== id));

    const addClient = (c) => setClients([...clients, { ...c, id: Date.now() }]);
    const updateClient = (id, updated) => setClients(clients.map(c => c.id === id ? { ...updated, id } : c));
    const deleteClient = (id) => {
        if (pets.some(p => String(p.ownerId) === String(id))) {
            alert("No puedes borrar un cliente con mascotas vinculadas.");
            return;
        }
        setClients(clients.filter(c => c.id !== id));
    };

    const addPet = (p) => setPets([...pets, { ...p, id: Date.now() }]);
    const updatePet = (id, updated) => setPets(pets.map(p => p.id === id ? { ...updated, id } : p));
    const deletePet = (id) => setPets(pets.filter(p => p.id !== id));

    const addSale = (item, price) => setSales([{ id: Date.now(), date: new Date().toLocaleDateString(), item, price }, ...sales]);

    return (
        <DataContext.Provider value={{ 
            services, products, pets, clients, sales,
            addService, updateService, deleteService,
            addProduct, updateProduct, deleteProduct,
            addClient, updateClient, deleteClient,
            addPet, updatePet, deletePet, addSale
        }}>
            {children}
        </DataContext.Provider>
    );
};