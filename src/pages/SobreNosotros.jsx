// src/pages/SobreNosotros.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp, FaMapMarkerAlt, FaHeart } from 'react-icons/fa';
import './SobreNosotros.css';

import logoTPS from '../assets/logo2.png';

const WA_NUMBER = '5215633252525';
const WA_MSG    = encodeURIComponent('Hola, me interesa conocer más sobre Taylor\'s Pet Services.');

const VALORES = [
    { icon: '❤️', title: 'Amor por los animales', desc: 'Cada mascota es tratada como si fuera nuestra. El bienestar y comodidad de tu compañero es nuestra prioridad.' },
    { icon: '⭐', title: 'Calidad premium',        desc: 'Utilizamos productos cosméticos de alta gama para garantizar la calidad del servicio y el cuidado que tu mascota merece.' },
    { icon: '👨‍💼', title: 'Personal certificado',  desc: 'Contamos con personal capacitado y en constante formación para brindarte el mejor servicio del mercado.' },
    { icon: '🏆', title: 'Experiencia',            desc: 'Más de 10 años en el mercado nos avalan. Somos una empresa establecida con amplia experiencia en el cuidado de mascotas.' },
];

const SERVICIOS = [
    { icon: '✂️', label: 'Grooming' },
    { icon: '🛁', label: 'Baños especializados' },
    { icon: '🐕', label: 'Paseos' },
    { icon: '🛍️', label: 'Tienda' },
    { icon: '🏠', label: 'Guardería (pronto)' },
    { icon: '🚗', label: 'A domicilio' },
];

const SobreNosotros = () => (
    <div className="sobre-container">

        {/* Hero */}
        <section className="sobre-hero">
            <div className="sobre-hero-content">
                {logoTPS
                    ? <img src={logoTPS} alt="Taylor's Pet Services" className="sobre-logo" />
                    : <h1 className="sobre-hero-brand">Taylor's Pet Services</h1>
                }
                <p className="sobre-hero-tagline">Grooming · Tienda · Guardería · Paseos</p>
                <p className="sobre-hero-desc">
                    Somos una empresa establecida con amplia experiencia en el mercado, dedicada al cuidado y bienestar de tu mejor amigo.
                </p>
                <div className="sobre-hero-actions">
                    <a href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="sobre-btn-primary">
                        <FaWhatsapp /> Contáctanos
                    </a>
                    <Link to="/servicios" className="sobre-btn-secondary">Ver servicios →</Link>
                </div>
            </div>
        </section>

        {/* Misión */}
        <section className="sobre-mision">
            <div className="sobre-section-inner">
                <div className="sobre-mision-text">
                    <span className="sobre-eyebrow">Nuestra misión</span>
                    <h2>El servicio que tú y<br />tu mejor amigo merecen</h2>
                    <p>
                        En Taylor's Pet Services creemos que cada mascota merece atención de calidad, con amor y profesionalismo. Utilizamos productos cosméticos de alta gama para garantizar la calidad de nuestros servicios, así como el cuidado que requieren para su conservación y mantenimiento.
                    </p>
                    <p>
                        Nuestro equipo está en constante formación para ofrecerte siempre lo mejor. Porque tu mascota es parte de tu familia, y merece ser tratada como tal.
                    </p>
                </div>
                <div className="sobre-mision-stats">
                    <div className="sobre-stat"><span className="sobre-stat-num">4000+</span><span className="sobre-stat-label">Clientes felices</span></div>
                    <div className="sobre-stat"><span className="sobre-stat-num">10+</span><span className="sobre-stat-label">Años de experiencia</span></div>
                    <div className="sobre-stat"><span className="sobre-stat-num">5★</span><span className="sobre-stat-label">Calificación</span></div>
                    <div className="sobre-stat"><span className="sobre-stat-num">3</span><span className="sobre-stat-label">Especialistas</span></div>
                </div>
            </div>
        </section>

        {/* Valores */}
        <section className="sobre-valores">
            <div className="sobre-section-inner">
                <span className="sobre-eyebrow">Lo que nos define</span>
                <h2>Nuestros valores</h2>
                <div className="sobre-valores-grid">
                    {VALORES.map(v => (
                        <div key={v.title} className="sobre-valor-card">
                            <span className="sobre-valor-icon">{v.icon}</span>
                            <h3>{v.title}</h3>
                            <p>{v.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Servicios */}
        <section className="sobre-servicios">
            <div className="sobre-section-inner">
                <span className="sobre-eyebrow">¿Qué ofrecemos?</span>
                <h2>Nuestros servicios</h2>
                <div className="sobre-servicios-grid">
                    {SERVICIOS.map(s => (
                        <div key={s.label} className="sobre-servicio-chip">
                            <span>{s.icon}</span> {s.label}
                        </div>
                    ))}
                </div>
                <Link to="/servicios" className="sobre-btn-primary" style={{ marginTop: 32, display: 'inline-flex' }}>
                    Ver catálogo completo →
                </Link>
            </div>
        </section>

        {/* Ubicación y redes */}
        <section className="sobre-contacto">
            <div className="sobre-section-inner sobre-contacto-grid">
                <div className="sobre-ubicacion">
                    <span className="sobre-eyebrow">Encuéntranos</span>
                    <h2>Visítanos</h2>
                    <p><FaMapMarkerAlt style={{ marginRight: 8 }} />Montevideo No. 157, Colonia Lindavista, GAM, CDMX</p>
                    <a
                        href="https://maps.app.goo.gl/HNpfNETNeUqptAbK6"
                        target="_blank" rel="noopener noreferrer"
                        className="sobre-btn-maps">
                        Abrir en Google Maps
                    </a>
                    <iframe
                        title="Ubicación Taylor's Pet Services"
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.0!2d-99.1395!3d19.4804!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDI4JzQ5LjQiTiA5OcKwMDgnMjIuMiJX!5e0!3m2!1ses-419!2smx!4v1700000000000"
                        width="100%" height="220"
                        style={{ border: 0, borderRadius: 20, marginTop: 20 }}
                        allowFullScreen="" loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </div>
                <div className="sobre-redes">
                    <span className="sobre-eyebrow">Síguenos</span>
                    <h2>Redes sociales</h2>
                    <p>Conoce nuestro día a día, transformaciones y ofertas especiales.</p>
                    <div className="sobre-social-list">
                        <a href="https://www.instagram.com/taylors.petservices.mx" target="_blank" rel="noopener noreferrer" className="sobre-social-item sobre-social--ig">
                            <FaInstagram /> <div><strong>Instagram</strong><span>@taylors.petservices.mx</span></div>
                        </a>
                        <a href="https://www.facebook.com/share/1LixCZxfux/" target="_blank" rel="noopener noreferrer" className="sobre-social-item sobre-social--fb">
                            <FaFacebook /> <div><strong>Facebook</strong><span>Taylor's Pet Services</span></div>
                        </a>
                        <a href="https://www.tiktok.com/@taylors.pet.services" target="_blank" rel="noopener noreferrer" className="sobre-social-item sobre-social--tt">
                            <FaTiktok /> <div><strong>TikTok</strong><span>@taylors.pet.services</span></div>
                        </a>
                        <a href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="sobre-social-item sobre-social--wa">
                            <FaWhatsapp /> <div><strong>WhatsApp</strong><span>56 33 25 25 25</span></div>
                        </a>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA */}
        <section className="sobre-cta">
            <FaHeart className="sobre-cta-icon" />
            <h2>¿Listo para consentir a tu mejor amigo?</h2>
            <p>Agenda tu cita hoy y descubre la diferencia de un servicio hecho con amor.</p>
            <div className="sobre-cta-btns">
                <Link to="/servicios" className="sobre-btn-primary">Reservar cita</Link>
                <Link to="/contacto" className="sobre-btn-secondary">Contáctanos</Link>
            </div>
        </section>
    </div>
);

export default SobreNosotros;