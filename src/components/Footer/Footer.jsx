// src/components/Footer/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp, FaMapMarkerAlt } from 'react-icons/fa';
import { useData } from '../../contexts/DataContext';
import { useBusinessPath } from '../../utils/businessPath';
import perruchoMark from '../../assets/perrucho-mark.svg';
import './Footer.css';

const isExternalLink = (url) => /^https?:\/\//i.test(url || '');

const Footer = () => {
    const { settings } = useData();
    const { withBusinessPath: withSlug } = useBusinessPath();
    const year = new Date().getFullYear();

    const logoTPS = settings?.logoUrl || perruchoMark;
    const businessName = settings?.businessName || 'Emporio';
    const slogan = settings?.slogan;
    // Bug real (Emporio Uñas/Pestañas): estos "|| ..." fallback eran los
    // datos REALES de Taylor's (WhatsApp, dirección, Instagram/Facebook/
    // TikTok, categorías de servicio) — cualquier negocio sin esa info
    // propia terminaba mostrando/enlazando a Taylor's. Ahora, sin dato
    // propio, esa fila/ícono/columna simplemente no se muestra.
    const hasWhatsapp = Boolean(settings?.whatsappNumber);
    const waNumber = hasWhatsapp ? `52${settings.whatsappNumber.replace(/\D/g, '')}` : null;
    const waMsg = encodeURIComponent(`Hola, me interesa agendar una cita en ${businessName}.`);
    const footerLinks = settings?.footerLinks?.filter((l) => l?.label) || [];
    const hasSocial = settings?.instagramUrl || settings?.facebookUrl || settings?.tiktokUrl;

    return (
        <footer className="footer-container">
            <div className="footer-inner">

                {/* ── Marca ── */}
                <div className="footer-brand">
                    <img src={logoTPS} alt={businessName} className="footer-logo" />
                    {slogan && <p className="footer-tagline">{slogan}</p>}
                    {(hasSocial || hasWhatsapp) && (
                        <div className="footer-social">
                            {settings?.instagramUrl && (
                                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                    <FaInstagram />
                                </a>
                            )}
                            {settings?.facebookUrl && (
                                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                    <FaFacebook />
                                </a>
                            )}
                            {settings?.tiktokUrl && (
                                <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                                    <FaTiktok />
                                </a>
                            )}
                            {hasWhatsapp && (
                                <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                                    <FaWhatsapp />
                                </a>
                            )}
                        </div>
                    )}
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
                {footerLinks.length > 0 && (
                    <div className="footer-nav">
                        <h4>Servicios</h4>
                        {footerLinks.map((l, i) => (
                            isExternalLink(l.url)
                                ? <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
                                : <Link key={i} to={l.url ? withSlug(l.url) : '#'}>{l.label}</Link>
                        ))}
                    </div>
                )}

                {/* ── Contacto ── */}
                {(hasWhatsapp || settings?.businessAddress) && (
                    <div className="footer-contact">
                        <h4>Contáctanos</h4>
                        {hasWhatsapp && (
                            <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                                <FaWhatsapp /> <span>{settings.whatsappNumber}</span>
                            </a>
                        )}
                        {settings?.businessAddress && (
                            <a href={settings?.businessMapsUrl || '#'} target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                                <FaMapMarkerAlt /> <span>{settings.businessAddress}</span>
                            </a>
                        )}
                    </div>
                )}
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
