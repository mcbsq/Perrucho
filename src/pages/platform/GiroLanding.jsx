// src/pages/platform/GiroLanding.jsx
//
// Landing de plataforma por giro — /:giro (ej. /uñas), distinta de
// /:giro/:slug que es la página pública de un negocio YA registrado. Le
// vende Emporio a alguien de ese giro específico en vez de mostrarle la
// landing genérica: "Emporio es un gestor de negocios especializado en
// uñas" en vez de "Emporio sirve para cualquier negocio de servicios".
import React, { useEffect, useRef } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { PiArrowRightBold, PiCheckCircleBold } from 'react-icons/pi';
import { GIRO_PRESETS, getGiroFromUrlLabel, getGiroUrlLabel } from '../../config/giroPresets';
import { getGiroMarketing } from '../../config/giroMarketing';
import './PerruchoLanding.css';
import './GiroLanding.css';

const OTHER_GIROS = Object.entries(GIRO_PRESETS);

const GiroLanding = () => {
    const { giro: urlGiro } = useParams();
    const giroKey = getGiroFromUrlLabel(urlGiro);
    const revealRef = useRef(null);

    useEffect(() => {
        const nodes = revealRef.current ? Array.from(revealRef.current.querySelectorAll('.pl-reveal')) : [];
        if (!nodes.length || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
            { threshold: 0.15 }
        );
        nodes.forEach((n) => observer.observe(n));
        return () => observer.disconnect();
    }, [giroKey]);

    // Giro no reconocido en la URL (ej. /banano) — a la landing general en
    // vez de renderizar una página vacía o inventar contenido.
    if (!giroKey) return <Navigate to="/" replace />;

    const preset = GIRO_PRESETS[giroKey];
    const marketing = getGiroMarketing(giroKey);

    return (
        <div className="pl-page">
            <header className="pl-header">
                <Link to="/" className="pl-logo">Emporio</Link>
                <Link to="/crear-negocio" className="pl-header-link">Registrar mi negocio →</Link>
            </header>

            <section className="pl-hero gl-hero">
                <div className="pl-hero-bg" aria-hidden="true">
                    <div className="pl-hero-slide is-active gl-hero-slide" style={{ backgroundImage: `url(${marketing.img})` }} />
                    <div className="pl-hero-overlay" />
                </div>
                <div className="pl-hero-content">
                    <span className="gl-eyebrow">Emporio para {preset.label.toLowerCase()}</span>
                    <h1>{marketing.headline}</h1>
                    <p className="pl-hero-sub">{marketing.subtitle}</p>
                    <div className="pl-hero-actions">
                        <Link to={`/crear-negocio?giro=${giroKey}`} className="pl-cta-primary">
                            Registra tu negocio <PiArrowRightBold />
                        </Link>
                        <Link to="/" className="pl-cta-secondary">Ver todos los giros</Link>
                    </div>
                </div>
            </section>

            <div ref={revealRef}>
                <section className="gl-highlights pl-reveal">
                    {marketing.highlights.map((h) => (
                        <div key={h.title} className="gl-highlight-card">
                            <PiCheckCircleBold className="gl-highlight-icon" />
                            <h3>{h.title}</h3>
                            <p>{h.desc}</p>
                        </div>
                    ))}
                </section>

                <section className="pl-cta-final pl-reveal">
                    <h2>¿Listo para digitalizar tu {preset.label.toLowerCase()}?</h2>
                    <Link to={`/crear-negocio?giro=${giroKey}`} className="pl-cta-primary">
                        Regístrate gratis <PiArrowRightBold />
                    </Link>
                </section>

                <section className="gl-other-giros pl-reveal">
                    <span className="gl-other-giros-label">Emporio también sirve para</span>
                    <div className="gl-other-giros-chips">
                        {OTHER_GIROS.filter(([key]) => key !== giroKey).map(([key, p]) => (
                            <Link key={key} to={`/${getGiroUrlLabel(key)}`} className="pl-giro-chip">
                                {p.label}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            <footer className="pl-footer">
                <span>Emporio — hecho con 🐾 por CIBERCOM</span>
            </footer>
        </div>
    );
};

export default GiroLanding;
