// src/pages/Services/Services.jsx
import React, { useState, useEffect } from 'react';
import ServiceModal from './ServiceModal';
import './Services.css';

const Services = () => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState(null);

    // Cargamos los servicios que guardaste en el Admin
    useEffect(() => {
        const savedServices = JSON.parse(localStorage.getItem('services')) || [];
        setServices(savedServices);
    }, []);

    // Función para cerrar el modal y limpiar la selección
    const handleCloseModal = () => {
        setSelectedService(null);
    };

    return (
        <div className="services-page-container">
            <header className="services-header">
                <div className="premium-badge">Nuestros Servicios</div>
                <h1>Experiencias para tu <span>mascota</span></h1>
                <p className="services-subtitle">
                    Calidad médica y estética con la comodidad que ellos merecen.
                </p>
            </header>

            {/* GRID DE SERVICIOS - Se muestra siempre */}
            <div className="services-grid-container">
                {services.length > 0 ? (
                    services.map((service) => (
                        <div key={service.id} className="service-card-capsule">
                            <div className="icon-box">{service.icon || '🐾'}</div>
                            <div className="card-body">
                                <h2>{service.title}</h2>
                                <p>{service.description}</p>
                                <div className="tags-row">
                                    <span className="info-tag">🕒 {service.duration}</span>
                                    <span className="info-tag price">💰 ${service.price}</span>
                                </div>
                            </div>
                            {/* AL HACER CLIC AQUÍ, SE ACTIVA EL MODAL */}
                            <button 
                                className="btn-reserve" 
                                onClick={() => setSelectedService(service)}
                            >
                                RESERVAR AHORA
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="no-services">No hay servicios disponibles por ahora.</p>
                )}
            </div>

            {/* MODAL: Solo se renderiza si hay un servicio seleccionado */}
            {selectedService && (
                <ServiceModal 
                    service={selectedService} 
                    onClose={handleCloseModal} 
                />
            )}
        </div>
    );
};

export default Services;