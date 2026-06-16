// src/pages/Contact.jsx
import React from 'react';
import { FaWhatsapp, FaInstagram, FaFacebook, FaTiktok, FaMapMarkerAlt } from 'react-icons/fa';
import './Contact.css';

const WA_NUMBER = '5215633252525';
const WA_MSG    = encodeURIComponent('Hola, me interesa agendar una cita para mi mascota en Taylor\'s Pet Services.');

const Contact = () => {
    return (
        <div className="contact-page-container fade-in">
            <header className="contact-header">
                <div className="premium-badge">Contacto Directo</div>
                <h1>Estamos para <span>escucharte</span></h1>
                <p>Elige el canal que prefieras, estamos listos para atenderte a ti y a tu mascota.</p>
            </header>

            {/* Canales de contacto */}
            <div className="contact-grid-channels">
                <a
                    href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`}
                    target="_blank" rel="noopener noreferrer"
                    className="contact-card-capsule">
                    <div className="contact-icon-box whatsapp"><FaWhatsapp /></div>
                    <h3>WhatsApp</h3>
                    <p>Agenda citas, consulta servicios o resuelve dudas directamente.</p>
                    <span className="contact-link-label">56 33 25 25 25</span>
                </a>

                <div className="contact-card-capsule">
                    <div className="contact-icon-box social"><FaInstagram /></div>
                    <h3>Síguenos</h3>
                    <div className="social-links-row">
                        <a href="https://www.instagram.com/taylors.petservices.mx" target="_blank" rel="noopener noreferrer" title="Instagram"><FaInstagram /></a>
                        <a href="https://www.facebook.com/share/1LixCZxfux/" target="_blank" rel="noopener noreferrer" title="Facebook"><FaFacebook /></a>
                        <a href="https://www.tiktok.com/@taylors.pet.services" target="_blank" rel="noopener noreferrer" title="TikTok"><FaTiktok /></a>
                    </div>
                    <p>Mira nuestro día a día con los peludos clientes.</p>
                    <span className="contact-link-label">@taylors.petservices.mx</span>
                </div>

                <a
                    href="https://maps.app.goo.gl/HNpfNETNeUqptAbK6"
                    target="_blank" rel="noopener noreferrer"
                    className="contact-card-capsule">
                    <div className="contact-icon-box call"><FaMapMarkerAlt /></div>
                    <h3>Visítanos</h3>
                    <p>Montevideo No. 157, Colonia Lindavista, GAM, CDMX</p>
                    <span className="contact-link-label">Abrir en Maps</span>
                </a>
            </div>

            {/* Mapa de la sucursal */}
            <section className="branches-section">
                <h2 className="section-title">Nuestra Ubicación</h2>
                <div className="branches-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="branch-card-luxury">
                        <div className="branch-map-container">
                            <iframe
                                title="Taylor's Pet Services - Lindavista"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.0!2d-99.1395!3d19.4804!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDI4JzQ5LjQiTiA5OcKwMDgnMjIuMiJX!5e0!3m2!1ses-419!2smx!4v1700000000000"
                                width="100%" height="280"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                        <div className="branch-content">
                            <div className="branch-header-info">
                                <FaMapMarkerAlt className="marker-icon" />
                                <h3>Taylor's Pet Services — Lindavista</h3>
                            </div>
                            <p className="branch-address">Montevideo No. 157, Colonia Lindavista, GAM, CDMX</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>
                                📱 WhatsApp: <strong>56 33 25 25 25</strong>
                            </p>
                            <a
                                href="https://maps.app.goo.gl/HNpfNETNeUqptAbK6"
                                target="_blank" rel="noopener noreferrer"
                                className="btn-open-maps">
                                Abrir en Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;