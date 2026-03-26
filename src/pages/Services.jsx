// src/pages/Services.jsx
import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import { useData }         from '../contexts/DataContext';
import { useAuth }         from '../contexts/AuthContext';
import ServiceModal        from '../components/ServiceModal/ServiceModal';
import './Services.css';

// ─── Fallbacks (mismos que Home.jsx) ─────────────────────────────────────────
function inferColor(service) {
    const cat   = (service.category || '').toLowerCase();
    const title = (service.title    || '').toLowerCase();
    if (title.includes('corte') || cat.includes('estét')) return 'lavender';
    if (title.includes('uña'))                            return 'mint';
    if (cat.includes('veter') || cat.includes('médic'))   return 'mint';
    return 'blue';
}

function inferIcon(service) {
    const cat   = (service.category || '').toLowerCase();
    const title = (service.title    || '').toLowerCase();
    if (title.includes('baño')  || cat.includes('higien')) return '🛁';
    if (title.includes('corte') || cat.includes('estét'))  return '✂️';
    if (title.includes('uña'))                             return '🐾';
    if (title.includes('vacun'))                           return '💉';
    if (cat.includes('veter')   || cat.includes('médic'))  return '🏥';
    return '🐾';
}

// ─── Card de servicio — idéntica a Home ──────────────────────────────────────
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
            <div className="svc-size-selector">
                {['chico','mediano','grande'].map(size => (
                    <button
                        key={size}
                        className={`svc-size-btn ${selectedSize === size ? 'active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                    >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                ))}
            </div>
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

// ─── Página de Servicios ──────────────────────────────────────────────────────
const Services = () => {
    const { services, loading } = useData();
    const { isLoggedIn }        = useAuth();
    const navigate              = useNavigate();
    const [selected, setSelected] = useState(null);

    const handleReserve = (service) => {
        if (!isLoggedIn) {
            navigate('/acceso', { state: { from: '/servicios' } });
            return;
        }
        setSelected(service);
    };

    return (
        <div className="services-page-container">

            <header className="services-header">
                <div className="premium-badge">Nuestros Servicios</div>
                <h1>Experiencias para tu <span>mascota</span></h1>
                <p className="services-subtitle">
                    Selecciona el tamaño de tu mascota para ver el precio exacto.
                </p>
            </header>

            <div className="svc-cards-grid svc-cards-grid--page">
                {loading ? (
                    <p className="no-services">Cargando servicios...</p>
                ) : services.length > 0 ? (
                    services.map(service => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            onReserve={handleReserve}
                            isLoggedIn={isLoggedIn}
                        />
                    ))
                ) : (
                    <p className="no-services">
                        No hay servicios disponibles por ahora.
                    </p>
                )}
            </div>

            {/* Modal de reserva — conectado a JSON Server */}
            {selected && (
                <ServiceModal
                    service={selected}
                    onClose={() => setSelected(null)}
                />
            )}
        </div>
    );
};

export default Services;