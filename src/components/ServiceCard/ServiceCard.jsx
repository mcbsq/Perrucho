// src/components/ServiceCard/ServiceCard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Componente ÚNICO de tarjeta de servicio.
// Antes estaba duplicado en Home.jsx y Services.jsx — cualquier cambio
// requería editarlo en dos lugares. Ahora vive aquí y ambas páginas lo importan.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import './ServiceCard.css';

// ── Helpers: color e ícono por defecto si la BD no los trae ──────────────────
export function inferColor(service) {
    const cat   = (service.category || '').toLowerCase();
    const title = (service.title    || '').toLowerCase();
    if (title.includes('corte') || cat.includes('estét')) return 'lavender';
    if (title.includes('uña'))                            return 'mint';
    if (cat.includes('veter')   || cat.includes('médic')) return 'mint';
    return 'blue';
}

export function inferIcon(service) {
    const cat   = (service.category || '').toLowerCase();
    const title = (service.title    || '').toLowerCase();
    if (title.includes('baño')  || cat.includes('higien')) return '🛁';
    if (title.includes('corte') || cat.includes('estét'))  return '✂️';
    if (title.includes('uña'))                             return '🐾';
    if (title.includes('vacun'))                           return '💉';
    if (cat.includes('veter')   || cat.includes('médic'))  return '🏥';
    return '🐾';
}

// ── Componente principal ─────────────────────────────────────────────────────
const ServiceCard = ({ service, onReserve, isLoggedIn }) => {
    const [selectedSize, setSelectedSize] = useState('mediano');

    const base   = Number(service.price) || 0;
    const prices = {
        chico:   service.priceChico   ?? base,
        mediano: service.priceMediano ?? +(base * 1.25).toFixed(0),
        grande:  service.priceGrande  ?? +(base * 1.50).toFixed(0),
    };

    const color = service.color || inferColor(service);
    const icon  = service.icon  || inferIcon(service);

    return (
        <div className={`svc-card svc-card--${color}`}>
            {service.popular && (
                <div className="svc-popular-badge">⭐ Más popular</div>
            )}

            <div className={`svc-icon-wrap svc-icon-wrap--${color}`}>
                <span className="svc-icon">{icon}</span>
            </div>

            <h3 className="svc-title">{service.title}</h3>
            <p className="svc-desc">{service.description || `Servicio de ${service.category}`}</p>

            {service.duration && (
                <span className="svc-duration">⏱ {service.duration}</span>
            )}

            {/* Selector de talla */}
            <div className="svc-size-selector">
                {['chico', 'mediano', 'grande'].map(size => (
                    <button
                        key={size}
                        className={`svc-size-btn ${selectedSize === size ? 'active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                    >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                ))}
            </div>

            {/* Precio dinámico */}
            <div className={`svc-price-display svc-price-display--${color}`}>
                <span className="svc-price-label">Precio</span>
                <span className="svc-price-amount">${prices[selectedSize]}</span>
            </div>

            <button
                className={`svc-cta-btn svc-cta-btn--${color}`}
                onClick={() => onReserve(service)}
            >
                {isLoggedIn ? 'Reservar ahora' : 'Inicia sesión para reservar'}
            </button>
        </div>
    );
};

export default ServiceCard;