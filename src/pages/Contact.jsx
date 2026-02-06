// src/pages/Contact/Contact.jsx
import React from 'react';
import { FaPhoneAlt, FaWhatsapp, FaInstagram, FaFacebook, FaMapMarkerAlt } from 'react-icons/fa';
import './Contact.css';

const Contact = () => {
    // Datos de sucursales con el enlace de EMBED (Iframe)
    const sucursales = [
        {
            id: 1,
            nombre: "Sucursal Central - Coatepec",
            direccion: "Calle Principal #123, Centro, Coatepec",
            telefono: "+52 228 123 4567",
            // Ejemplo: Coatepec Centro
            embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15053.447019808605!2d-96.9676646!3d19.4507024!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85db2d645e7f3089%3A0x6334a1705e4d2932!2sCoatepec%2C%20Ver.!5e0!3m2!1ses-419!2smx!4v1700000000000!5m2!1ses-419!2smx",
            mapLink: "https://maps.app.goo.gl/96qU6"
        },
        {
            id: 2,
            nombre: "Sucursal Norte - Xalapa",
            direccion: "Av. Araucarias #456, Indeco Animas, Xalapa",
            telefono: "+52 228 987 6543",
            // Ejemplo: Ánimas Xalapa
            embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3760.4706560942517!2d-96.8858509!3d19.5212458!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85db321908560001%3A0x86782782e5b4136e!2sPlaza%20Animas!5e0!3m2!1ses-419!2smx!4v1700000000000!5m2!1ses-419!2smx",
            mapLink: "https://maps.app.goo.gl/96qU7"
        }
    ];

    return (
        <div className="contact-page-container fade-in">
            <header className="contact-header">
                <div className="premium-badge">Contacto Directo</div>
                <h1>Estamos para <span>escucharte</span></h1>
                <p>Elige el canal que prefieras, estamos listos para atenderte a ti y a tu mascota.</p>
            </header>

            {/* SECCIÓN DE CANALES */}
            <div className="contact-grid-channels">
                <a href="tel:+522281234567" className="contact-card-capsule">
                    <div className="contact-icon-box call"><FaPhoneAlt /></div>
                    <h3>Llámanos</h3>
                    <p>Atención inmediata para urgencias y dudas.</p>
                    <span className="contact-link-label">Iniciar llamada</span>
                </a>

                <a href="https://wa.me/522281234567" target="_blank" rel="noopener noreferrer" className="contact-card-capsule">
                    <div className="contact-icon-box whatsapp"><FaWhatsapp /></div>
                    <h3>WhatsApp</h3>
                    <p>Agenda citas o pregunta por productos.</p>
                    <span className="contact-link-label">Enviar mensaje</span>
                </a>

                <div className="contact-card-capsule">
                    <div className="contact-icon-box social"><FaInstagram /></div>
                    <h3>Síguenos</h3>
                    <div className="social-links-row">
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><FaFacebook /></a>
                    </div>
                    <p>Mira nuestro día a día con los pacientes.</p>
                </div>
            </div>

            {/* SECCIÓN DE SUCURSALES CON MAPAS INTERACTIVOS */}
            <section className="branches-section">
                <h2 className="section-title">Nuestras Ubicaciones</h2>
                <div className="branches-grid">
                    {sucursales.map(sucursal => (
                        <div key={sucursal.id} className="branch-card-luxury">
                            <div className="branch-map-container">
                                <iframe 
                                    title={sucursal.nombre}
                                    src={sucursal.embedUrl} 
                                    width="100%" 
                                    height="250" 
                                    style={{ border: 0 }} 
                                    allowFullScreen="" 
                                    loading="lazy" 
                                    referrerPolicy="no-referrer-when-downgrade"
                                ></iframe>
                            </div>
                            
                            <div className="branch-content">
                                <div className="branch-header-info">
                                    <FaMapMarkerAlt className="marker-icon" />
                                    <h3>{sucursal.nombre}</h3>
                                </div>
                                <p className="branch-address">{sucursal.direccion}</p>
                                <p className="branch-tel"><strong>Tel:</strong> {sucursal.telefono}</p>
                                
                                <a 
                                    href={sucursal.mapLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn-open-maps"
                                >
                                    Abrir en Google Maps
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Contact;