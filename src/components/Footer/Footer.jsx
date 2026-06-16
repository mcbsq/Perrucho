// src/components/Footer/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import './Footer.css';

// Logo: pon tu archivo como src/assets/logo.png para activarlo
// import logoTPS from '../../assets/logo.png';
const logoTPS = null; // cambia a: import logoTPS from '../../assets/logo.png' cuando tengas el archivo

const WA_NUMBER = '5215633252525';
const WA_MSG    = encodeURIComponent('Hola, me interesa agendar una cita para mi mascota en Taylor\'s Pet Services.');

const Footer = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="footer-container">
            <div className="footer-inner">

                {/* ── Marca ── */}
                <div className="footer-brand">
                    {logoTPS
                        ? <img src={logoTPS} alt="Taylor's Pet Services" className="footer-logo" />
                        : <span className="footer-brand-name">Taylor's Pet Services</span>
                    }
                    <p className="footer-tagline">
                        El servicio que tú y tu mejor amigo merecen.
                    </p>
                    <div className="footer-social">
                        <a href="https://www.instagram.com/taylors.petservices.mx" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <FaInstagram />
                        </a>
                        <a href="https://www.facebook.com/share/1LixCZxfux/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <FaFacebook />
                        </a>
                        <a href="https://www.tiktok.com/@taylors.pet.services" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                            <FaTiktok />
                        </a>
                        <a href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                            <FaWhatsapp />
                        </a>
                    </div>
                </div>

                {/* ── Navegación ── */}
                <div className="footer-nav">
                    <h4>Navegación</h4>
                    <Link to="/">Inicio</Link>
                    <Link to="/servicios">Servicios</Link>
                    <Link to="/tienda">Tienda</Link>
                    <Link to="/sobre-nosotros">Sobre nosotros</Link>
                </div>

                {/* ── Servicios ── */}
                <div className="footer-nav">
                    <h4>Servicios</h4>
                    <span>Grooming básico</span>
                    <span>Baño y corte</span>
                    <span>Servicio premium</span>
                    <span>Paseos</span>
                    <span>Guardería (próximamente)</span>
                </div>

                {/* ── Contacto ── */}
                <div className="footer-contact">
                    <h4>Contáctanos</h4>
                    <a href={`https://wa.me/${WA_NUMBER}?text=${WA_MSG}`} target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                        <FaWhatsapp /> <span>56 33 25 25 25</span>
                    </a>
                    <a href="https://maps.app.goo.gl/HNpfNETNeUqptAbK6" target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                        <FaMapMarkerAlt /> <span>Montevideo No. 157, Col. Lindavista, GAM, CDMX</span>
                    </a>
                </div>
            </div>

            {/* ── Bottom bar ── */}
            <div className="footer-bottom">
                <p>Taylor's Pet Services | Todos los derechos reservados {year}.</p>
                <div className="footer-legal">
                    <Link to="/aviso-privacidad">Aviso de Privacidad</Link>
                    <Link to="/terminos">Términos y Condiciones</Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;