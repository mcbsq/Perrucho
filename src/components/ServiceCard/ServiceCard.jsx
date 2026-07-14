// src/components/ServiceCard/ServiceCard.jsx
//
// CAMBIOS v2 según catálogo real:
// - Selector de talla ahora usa los 6 rangos reales (Mini→Jumbo) del catálogo
// - Precio calculado con calcServicePrice() en lugar del multiplicador genérico
// - Los rangos muestran el rango de kg junto al nombre
// - Se importa pricingRules para mantener consistencia con el resto del sistema

import React, { useState } from 'react';
import './ServiceCard.css';
import { WEIGHT_RANGES, calcServicePrice } from '../../utils/pricingRules';

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
    const isCustomPricing = service.pricingMode === 'custom';
    const customOptions = service.customPriceOptions || [];

    // El rango por defecto es 'mediano' (el más común, 10-19kg)
    const [selectedRange, setSelectedRange] = useState('mediano');
    const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);

    // Obtener el rango seleccionado y calcular el precio con los 6 rangos reales
    const selectedRangeData = WEIGHT_RANGES.find(r => r.key === selectedRange);
    // Para el preview de la card pasamos un peso representativo del rango seleccionado
    const representativeWeight = {
        mini:    3,
        chico:   7,
        mediano: 14,
        grande:  25,
        extra:   38,
        jumbo:   50,
    };
    const displayPrice = isCustomPricing
        ? Number(customOptions[selectedOptionIdx]?.price) || 0
        : calcServicePrice(service, representativeWeight[selectedRange]);

    const color = service.color || inferColor(service);
    const icon  = service.icon  || inferIcon(service);

    return (
        <div className={`svc-card svc-card--${color}`}>
            {service.popular && (
                <div className="svc-popular-badge">⭐ Más popular</div>
            )}

            <div className={`svc-icon-wrap svc-icon-wrap--${color}`}>
                {service.imageUrl
                    ? <img src={service.imageUrl} alt="" className="svc-photo" />
                    : <span className="svc-icon">{icon}</span>
                }
            </div>

            <h3 className="svc-title">{service.title}</h3>
            <p className="svc-desc">{service.description || `Servicio de ${service.category}`}</p>

            {isCustomPricing ? (
                <div className="svc-size-selector">
                    {customOptions.map((opt, i) => (
                        <button
                            key={i}
                            className={`svc-size-btn ${selectedOptionIdx === i ? 'active' : ''}`}
                            onClick={() => setSelectedOptionIdx(i)}
                            title={opt.label}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            ) : (
                <>
                    {/* Selector de talla — 6 rangos del catálogo */}
                    <div className="svc-size-selector">
                        {WEIGHT_RANGES.map(range => (
                            <button
                                key={range.key}
                                className={`svc-size-btn ${selectedRange === range.key ? 'active' : ''}`}
                                onClick={() => setSelectedRange(range.key)}
                                title={range.desc}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>

                    {/* Rango de kg del tamaño seleccionado */}
                    {selectedRangeData && (
                        <span className="svc-range-desc">{selectedRangeData.desc}</span>
                    )}
                </>
            )}

            {/* Precio dinámico */}
            <div className={`svc-price-display svc-price-display--${color}`}>
                <span className="svc-price-label">Precio estimado</span>
                <span className="svc-price-amount">${displayPrice}</span>
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