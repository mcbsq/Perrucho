// src/components/BusinessLayout.jsx
//
// Ruta layout /:businessSlug — envuelve las páginas públicas (Home,
// Servicios, Tienda, Sobre nosotros, Acceso, Registro) en BusinessProvider,
// que resuelve el slug contra el backend antes de renderizar nada más.
import React from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { BusinessProvider, useBusiness } from '../contexts/BusinessContext';

const BusinessGate = ({ children }) => {
    const { loading, notFound } = useBusiness();

    const centered = { minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' };

    if (loading) {
        return <div style={centered}>Cargando...</div>;
    }
    if (notFound) {
        return (
            <div style={centered}>
                <h1>Negocio no encontrado</h1>
                <p>La dirección a la que intentas entrar no corresponde a ningún negocio registrado.</p>
            </div>
        );
    }
    return children;
};

const BusinessLayout = () => {
    const { businessSlug } = useParams();

    return (
        <BusinessProvider slug={businessSlug}>
            <BusinessGate>
                <Outlet />
            </BusinessGate>
        </BusinessProvider>
    );
};

export default BusinessLayout;
