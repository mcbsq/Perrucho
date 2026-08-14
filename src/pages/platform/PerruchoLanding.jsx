// src/pages/platform/PerruchoLanding.jsx
//
// Landing page de la PLATAFORMA Perrucho — antes la raíz del sitio
// redirigía directo a /taylors, lo cual tenía sentido con un solo negocio
// pero no ahora que Perrucho es multi-negocio (feedback real del cliente).
// Esta página explica el producto y lleva al alta de un negocio nuevo; cada
// negocio individual sigue viviendo en su propio /:businessSlug.
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    PiCalendarCheckBold, PiCashRegisterBold, PiPackageBold, PiUsersThreeBold,
    PiScissorsBold, PiPaintBrushBold, PiFlowerLotusBold, PiStethoscopeBold,
    PiBarbellBold, PiPawPrintBold, PiArrowRightBold,
} from 'react-icons/pi';
import './PerruchoLanding.css';

const FEATURES = [
    { icon: PiCalendarCheckBold, title: 'Agenda de citas', desc: 'Tus clientes reservan solos, en línea, sin llamadas ni WhatsApp perdidos.' },
    { icon: PiCashRegisterBold, title: 'Punto de venta', desc: 'Cobra servicios y productos, genera el recibo, todo desde el mismo panel.' },
    { icon: PiPackageBold, title: 'Inventario', desc: 'Controla tu stock de productos sin hojas de cálculo aparte.' },
    { icon: PiUsersThreeBold, title: 'Clientes y equipo', desc: 'Da de alta a tu personal y administra tu cartera de clientes en un solo lugar.' },
];

// Un giro por imagen del hero — mismo set que ofrece el selector del alta de
// negocio (src/config/giroPresets.js), así el fondo va mostrando justo lo
// que alguien puede llegar a registrar.
const GIROS = [
    {
        value: 'mascotas', icon: PiPawPrintBold, label: 'Veterinaria y grooming',
        img: 'https://images.unsplash.com/photo-1625277743460-43716b93507a?auto=format&fit=crop&w=1600&q=70',
    },
    {
        value: 'unas-pestanas', icon: PiPaintBrushBold, label: 'Uñas y pestañas',
        img: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=70',
    },
    {
        value: 'spa', icon: PiFlowerLotusBold, label: 'Spa y bienestar',
        img: 'https://images.unsplash.com/photo-1620733723572-11c53f73a416?auto=format&fit=crop&w=1600&q=70',
    },
    {
        value: 'barberia', icon: PiScissorsBold, label: 'Barbería',
        img: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1600&q=70',
    },
    {
        value: 'clinica', icon: PiStethoscopeBold, label: 'Clínica',
        img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1600&q=70',
    },
    {
        value: 'gimnasio', icon: PiBarbellBold, label: 'Gimnasio',
        img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=70',
    },
];

const SLIDE_MS = 4800;

// Carrusel de fondo del hero — va recorriendo un giro distinto cada pocos
// segundos (con Ken Burns + parallax al hacer scroll) para transmitir que
// Perrucho sirve para cualquier tipo de negocio de servicios, no solo el
// giro con el que arrancó (mascotas/Taylor's).
const HeroCarousel = ({ activeIndex, scrollY }) => (
    // El parallax (instantáneo, ligado al scroll) vive en este wrapper; el
    // zoom Ken Burns de cada slide es una animación CSS aparte — mezclarlos
    // en una sola transform con transition hacía que cada pixel de scroll
    // reiniciara la transición larga del zoom y el parallax se sintiera con
    // lag en vez de seguir el dedo/scroll al instante.
    <div className="pl-hero-bg" aria-hidden="true" style={{ transform: `translate3d(0, ${scrollY * 0.15}px, 0)` }}>
        {GIROS.map((g, i) => (
            <div
                key={g.value}
                className={`pl-hero-slide${i === activeIndex ? ' is-active' : ''}`}
                style={{ backgroundImage: `url(${g.img})` }}
            />
        ))}
        <div className="pl-hero-overlay" />
    </div>
);

const PerruchoLanding = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const [scrollY, setScrollY] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const revealRef = useRef(null);

    // setTimeout en vez de setInterval, reprogramado en cada cambio de
    // activeIndex — así un clic manual en un giro reinicia la cuenta en vez
    // de que el auto-avance lo pise medio segundo después.
    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;
        const timer = setTimeout(() => {
            setActiveIndex((i) => (i + 1) % GIROS.length);
        }, SLIDE_MS);
        return () => clearTimeout(timer);
    }, [activeIndex]);

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                setScrollY(window.scrollY);
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Secciones debajo del hero entran con un fade-up suave la primera vez
    // que se ven, en vez de aparecer de golpe — un solo IntersectionObserver
    // para todas, no uno por sección.
    useEffect(() => {
        const nodes = revealRef.current ? Array.from(revealRef.current.querySelectorAll('.pl-reveal')) : [];
        if (!nodes.length || typeof IntersectionObserver === 'undefined') { setRevealed(true); return; }
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('is-visible');
                });
            },
            { threshold: 0.15 }
        );
        nodes.forEach((n) => observer.observe(n));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="pl-page">
            <header className="pl-header">
                <span className="pl-logo">Perrucho</span>
                <Link to="/taylors" className="pl-header-link">Ver un negocio en vivo →</Link>
            </header>

            <section className="pl-hero">
                <HeroCarousel activeIndex={activeIndex} scrollY={scrollY} />
                <div className="pl-hero-content">
                    <h1>El sistema para gestionar tu negocio de servicios</h1>
                    <p className="pl-hero-sub">
                        Agenda, punto de venta, inventario y clientes — todo en un solo panel,
                        con tu propia página para que tus clientes reserven solos.
                    </p>
                    <div className="pl-hero-actions">
                        <Link to="/crear-negocio" className="pl-cta-primary">
                            Registra tu negocio <PiArrowRightBold />
                        </Link>
                        <Link to="/taylors" className="pl-cta-secondary">Ver una demo</Link>
                    </div>
                    <div className="pl-hero-dots">
                        {GIROS.map((g, i) => (
                            <button
                                key={g.value}
                                type="button"
                                className={`pl-hero-dot${i === activeIndex ? ' is-active' : ''}`}
                                onClick={() => setActiveIndex(i)}
                                aria-label={`Mostrar ${g.label}`}
                            >
                                <g.icon />
                                <span>{g.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="pl-hero-scroll-cue" aria-hidden="true"><span /></div>
            </section>

            <div ref={revealRef}>
                <section className="pl-features pl-reveal">
                    {FEATURES.map((f) => (
                        <div key={f.title} className="pl-feature-card">
                            <div className="pl-feature-icon"><f.icon /></div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </section>

                <section className="pl-giros pl-reveal">
                    <h2>Se adapta a tu giro</h2>
                    <p className="pl-giros-sub">Perrucho ajusta las herramientas y el catálogo según a qué te dedicas.</p>
                    <div className="pl-giros-grid">
                        {GIROS.map((g) => (
                            <div key={g.value} className="pl-giro-chip">
                                <g.icon /> <span>{g.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="pl-cta-final pl-reveal">
                    <h2>¿Listo para digitalizar tu negocio?</h2>
                    <Link to="/crear-negocio" className="pl-cta-primary">
                        Regístrate gratis <PiArrowRightBold />
                    </Link>
                </section>
            </div>

            <footer className="pl-footer">
                <span>Perrucho — hecho con 🐾 por CIBERCOM</span>
            </footer>
        </div>
    );
};

export default PerruchoLanding;
