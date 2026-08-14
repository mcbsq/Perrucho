// src/components/Footer/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import { useData } from '../../contexts/DataContext';
import { useBusinessPath } from '../../utils/businessPath';
import perruchoMark from '../../assets/perrucho-mark.svg';
import './Footer.css';

const DEFAULT_FOOTER_LINKS = [
    { label: 'Grooming básico', url: '/servicios' },
    { label: 'Baño y corte', url: '/servicios' },
    { label: 'Servicio premium', url: '/servicios' },
    { label: 'Paseos', url: '/servicios' },
    { label: 'Guardería (próximamente)', url: '/servicios' },
];

const isExternalLink = (url) => /^https?:\/\//i.test(url || '');

const Footer = () => {
    const { settings } = useData();
    const { withBusinessPath: withSlug } = useBusinessPath();
    const year = new Date().getFullYear();

    const logoTPS = settings?.logoUrl || perruchoMark;
    const businessName = settings?.businessName || 'Emporio';
    const slogan = settings?.slogan || 'El servicio que tú y tu mejor amigo merecen.';
    const waNumber = settings?.whatsappNumber ? `52${settings.whatsappNumber.replace(/\D/g, '')}` : '5215633252525';
    const waMsg = encodeURIComponent(`Hola, me interesa agendar una cita para mi mascota en ${businessName}.`);
    const footerLinks = settings?.footerLinks?.length ? settings.footerLinks : DEFAULT_FOOTER_LINKS;

    return (
        <footer className="footer-container">
            <div className="footer-inner">

                {/* ── Marca ── */}
                <div className="footer-brand">
                    <img src={logoTPS} alt={businessName} className="footer-logo" />
                    <p className="footer-tagline">
                        {slogan}
                    </p>
                    <div className="footer-social">
                        <a href={settings?.instagramUrl || 'https://www.instagram.com/taylors.petservices.mx'} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <FaInstagram />
                        </a>
                        <a href={settings?.facebookUrl || 'https://www.facebook.com/share/1LixCZxfux/'} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <FaFacebook />
                        </a>
                        <a href={settings?.tiktokUrl || 'https://www.tiktok.com/@taylors.pet.services'} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                            <FaTiktok />
                        </a>
                        <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                            <FaWhatsapp />
                        </a>
                    </div>
                </div>

                {/* ── Navegación ── */}
                <div className="footer-nav">
                    <h4>Navegación</h4>
                    <Link to={withSlug('')}>Inicio</Link>
                    <Link to={withSlug('/servicios')}>Servicios</Link>
                    <Link to={withSlug('/tienda')}>Tienda</Link>
                    <Link to={withSlug('/sobre-nosotros')}>Sobre nosotros</Link>
                </div>

                {/* ── Servicios (editable desde Personalización → Pie de página) ── */}
                <div className="footer-nav">
                    <h4>Servicios</h4>
                    {footerLinks.map((l, i) => (
                        isExternalLink(l.url)
                            ? <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
                            : <Link key={i} to={l.url ? withSlug(l.url) : '#'}>{l.label}</Link>
                    ))}
                </div>

                {/* ── Contacto ── */}
                <div className="footer-contact">
                    <h4>Contáctanos</h4>
                    <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                        <FaWhatsapp /> <span>{settings?.whatsappNumber || '56 33 25 25 25'}</span>
                    </a>
                    <a href={settings?.businessMapsUrl || 'https://maps.app.goo.gl/HNpfNETNeUqptAbK6'} target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                        <FaMapMarkerAlt /> <span>{settings?.businessAddress || 'Montevideo No. 157, Col. Lindavista, GAM, CDMX'}</span>
                    </a>
                </div>
            </div>

            {/* ── Bottom bar ── */}
            <div className="footer-bottom">
                <p>{businessName} | Todos los derechos reservados {year}.</p>
                <div className="footer-legal">
                    <Link to="/aviso-privacidad">Aviso de Privacidad</Link>
                    <Link to="/terminos">Términos y Condiciones</Link>
                </div>
                <span className="footer-cibercom-badge">
                    Hecho con 🐾 por <strong>CIBERCOM</strong>
                </span>
            </div>
        </footer>
    );
};

export default Footer;
