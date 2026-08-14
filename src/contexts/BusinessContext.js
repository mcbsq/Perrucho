// src/contexts/BusinessContext.js
//
// Multi-tenant: resuelve el slug de la URL (/:businessSlug/...) contra el
// backend y deja disponible {business, loading, notFound} al resto de las
// páginas públicas envueltas por BusinessLayout. También le dice a
// apiClient qué slug mandar en cada request (X-Business-Slug) mientras no
// haya sesión — ver setActiveBusinessSlug en src/api/apiClient.js.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { businessApi, setActiveBusinessSlug } from '../api/apiClient';

const BusinessContext = createContext(null);

export const useBusiness = () => useContext(BusinessContext);

export const BusinessProvider = ({ slug, children }) => {
    const [business, setBusiness] = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setNotFound(false);
        setActiveBusinessSlug(slug);

        businessApi.getBySlug(slug)
            .then(data => { if (!cancelled) setBusiness(data); })
            .catch(() => { if (!cancelled) setNotFound(true); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [slug]);

    return (
        <BusinessContext.Provider value={{ business, loading, notFound }}>
            {children}
        </BusinessContext.Provider>
    );
};
