// src/components/WhatsAppButton/WhatsAppButton.jsx
import React from 'react';
import './WhatsAppButton.css';
import whatsappImage from '../../assets/whatsapp.png';

const WhatsAppIcon = () => (
    <img src={whatsappImage} alt="WhatsApp" className="whatsapp-icon-img" />
);

const WhatsAppButton = ({
    phoneNumber = "5215633252525",
    message = "Hola, me interesa agendar una cita para mi mascota en Taylor's Pet Services."
}) => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    return (
        <a href={url} target="_blank" rel="noopener noreferrer"
            className="whatsapp-button" aria-label="Contactar por WhatsApp">
            <WhatsAppIcon />
        </a>
    );
};

export default WhatsAppButton;