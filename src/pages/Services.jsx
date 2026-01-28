// src/pages/Services.jsx
import React, { useState } from 'react';
import ServiceModal from '../components/ServiceModal/ServiceModal';
import './styles.css'; // Estilos específicos de la página de Servicios

// Datos de los servicios disponibles (simulados)
const serviceData = [
    {
        id: 1,
        title: "Día de Spa & Grooming",
        description: "Incluye baño premium, corte de pelo (opcional), cepillado, limpieza de oídos y un masaje relajante. Ideal para consentir a tu mascota.",
        duration: "1.5 horas",
        price: 85,
        icon: "🛁"
    },
    {
        id: 2,
        title: "Paseo de Mascotas (2h)",
        description: "Paseo energizante de 2 horas en el parque, con enfoque en el ejercicio y la socialización. Incluye agua y snack saludable.",
        duration: "2 horas",
        price: 30,
        icon: "🐕"
    }
];

const Services = () => {
    // Estado para controlar qué servicio se va a reservar (o null si el modal está cerrado)
    const [selectedService, setSelectedService] = useState(null);

    // Abre el modal con la información del servicio
    const openModal = (service) => {
        setSelectedService(service);
    };

    // Cierra el modal
    const closeModal = () => {
        setSelectedService(null);
    };

    return (
        <div className="services-page-container">
            <h1>Agenda tu Servicio</h1>
            <p className="services-subtitle">Selecciona el tratamiento ideal para tu compañero peludo.</p>

            <div className="services-grid">
                {serviceData.map((service) => (
                    <div key={service.id} className="service-item-card">
                        <span className="service-icon">{service.icon}</span>
                        <h2>{service.title}</h2>
                        <p>{service.description}</p>
                        <div className="service-details">
                            <span className="detail-tag">Duración: {service.duration}</span>
                            <span className="detail-tag">Precio: ${service.price}</span>
                        </div>
                        <button 
                            className="reserve-service-button"
                            onClick={() => openModal(service)}
                        >
                            Reservar Ahora
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal de Reserva: se muestra si selectedService no es null */}
            {selectedService && (
                <ServiceModal 
                    service={selectedService} 
                    onClose={closeModal} 
                />
            )}
        </div>
    );
};

export default Services;