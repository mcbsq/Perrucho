// src/pages/Services.jsx
// ── ServiceCard ahora viene del componente compartido ─────────────────────────
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData }         from '../contexts/DataContext';
import { useAuth }         from '../contexts/AuthContext';
import ServiceModal        from '../components/ServiceModal/ServiceModal';
import ServiceCard         from '../components/ServiceCard/ServiceCard';
import { useBusinessPath } from '../utils/businessPath';
import './Services.css';

// Copy del encabezado — antes fijo "Experiencias para tu mascota" sin
// importar el giro (una cafetería mostraba eso también). El giro alimentos
// además reencuadra la página como "menú", no "servicios".
const HEADER_COPY = {
    mascotas: { badge: 'Nuestros Servicios', title: <>Experiencias para tu <span>mascota</span></>, subtitle: 'Selecciona el tamaño de tu mascota para ver el precio exacto.' },
    alimentos: { badge: 'Nuestro Menú', title: <>Lo que <span>ofrecemos</span></>, subtitle: 'Elige tu platillo o bebida y su tamaño.' },
    default: { badge: 'Nuestros Servicios', title: <>Experiencias para <span>ti</span></>, subtitle: 'Selecciona una opción para ver el precio exacto.' },
};

const Services = () => {
    const { services, loading, settings } = useData();
    const { isLoggedIn }        = useAuth();
    const navigate              = useNavigate();
    const { withBusinessPath }  = useBusinessPath();
    const [selected, setSelected] = useState(null);

    const handleReserve = (service) => {
        if (!isLoggedIn) {
            navigate(withBusinessPath('/acceso'), { state: { from: withBusinessPath('/servicios') } });
            return;
        }
        setSelected(service);
    };

    const headerCopy = HEADER_COPY[settings?.giro] || HEADER_COPY.default;

    return (
        <div className="services-page-container">

            <header className="services-header">
                <div className="premium-badge">{headerCopy.badge}</div>
                <h1>{headerCopy.title}</h1>
                <p className="services-subtitle">
                    {headerCopy.subtitle}
                </p>
            </header>

            {/* Usa el grid y el componente compartido */}
            <div className="svc-cards-grid svc-cards-grid--page">
                {loading ? (
                    <p className="svc-empty-msg">Cargando servicios...</p>
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
                    <p className="svc-empty-msg">No hay servicios disponibles por ahora.</p>
                )}
            </div>

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