// src/pages/Services.jsx
// ── ServiceCard ahora viene del componente compartido ─────────────────────────
import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import { useData }         from '../contexts/DataContext';
import { useAuth }         from '../contexts/AuthContext';
import ServiceModal        from '../components/ServiceModal/ServiceModal';
import ServiceCard         from '../components/ServiceCard/ServiceCard';
import './Services.css';

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