// src/components/BusinessLayout.jsx
//
// Ruta layout /:giro/:businessSlug — envuelve las páginas públicas (Home,
// Servicios, Tienda, Sobre nosotros, Acceso, Registro) en BusinessProvider,
// que resuelve el slug contra el backend antes de renderizar nada más. El
// giro en la URL es solo informativo (la resolución real es por slug, que
// ya es único globalmente) — si no coincide con el giro real del negocio
// (ej. alguien entra por /gimnasio/emporio-unas), se corrige la URL en vez
// de renderizar bajo una etiqueta equivocada.
import React from 'react';
import { useParams, Outlet, Navigate, useLocation } from 'react-router-dom';
import { BusinessProvider, useBusiness } from '../contexts/BusinessContext';
import { getGiroUrlLabel } from '../config/giroPresets';

const BusinessGate = ({ children }) => {
    const { business, loading, notFound } = useBusiness();
    const { giro: urlGiro, businessSlug } = useParams();
    const location = useLocation();

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

    const canonicalGiro = getGiroUrlLabel(business?.giro);
    if (canonicalGiro && urlGiro !== canonicalGiro) {
        const rest = location.pathname.replace(`/${urlGiro}/${businessSlug}`, '');
        return <Navigate to={`/${canonicalGiro}/${businessSlug}${rest}${location.search}`} replace />;
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
