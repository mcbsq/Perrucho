// src/components/WhatsAppButton/WhatsAppButton.jsx
import React from 'react';
import './WhatsAppButton.css'; 
// 1. Importamos la imagen PNG
import whatsappImage from '../../assets/whatsapp.png'; 

// 2. Eliminamos el componente SVG y lo reemplazamos por una función que retorna el <img>
const WhatsAppIcon = () => (
    // La imagen ya incluye el círculo verde, por lo que el botón CSS solo necesita centrarla.
    <img 
        src={whatsappImage}
        alt="WhatsApp Logo"
        className="whatsapp-icon-img" // Clase para controlar el tamaño en CSS
    />
);


const WhatsAppButton = ({ phoneNumber = "+521234567890", message = "Hola, me interesa agendar una cita de estética para mi mascota." }) => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-button"
            aria-label="Contactar por WhatsApp"
        >
            <WhatsAppIcon />
        </a>
    );
};

export default WhatsAppButton;