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
    PiBarbellBold, PiPawPrintBold, PiArrowRightBold, PiArrowLeftBold, PiMagicWandBold,
} from 'react-icons/pi';
import { GIRO_PRESETS, getGiroUrlLabel } from '../../config/giroPresets';
import { GIRO_MARKETING } from '../../config/giroMarketing';
import './PerruchoLanding.css';

// "theme" define el degradado propio de cada tarjeta del carrusel — así cada
// una se distingue de un vistazo en vez de repetir la misma tarjeta blanca
// cuatro veces (lo que se sentía más a lista que a producto).
const FEATURES = [
    {
        icon: PiCalendarCheckBold, title: 'Agenda de citas', tag: '0 llamadas perdidas', theme: 'blue',
        desc: 'Tus clientes reservan solos, en línea, sin llamadas ni WhatsApp perdidos.',
    },
    {
        icon: PiCashRegisterBold, title: 'Punto de venta', tag: 'Recibo al instante', theme: 'mint',
        desc: 'Cobra servicios y productos, genera el recibo, todo desde el mismo panel.',
    },
    {
        icon: PiPackageBold, title: 'Inventario', tag: 'Alertas de stock bajo', theme: 'lavender',
        desc: 'Controla tu stock de productos sin hojas de cálculo aparte.',
    },
    {
        icon: PiUsersThreeBold, title: 'Clientes y equipo', tag: 'Todo en un lugar', theme: 'coral',
        desc: 'Da de alta a tu personal y administra tu cartera de clientes en un solo lugar.',
    },
];

// Ícono por giro — lo único que giroPresets.js/giroMarketing.js no traen
// (es puramente decorativo, no hace falta que viva en la config compartida
// con el backend). Un giro por imagen del hero, tomadas de
// giroMarketing.js — mismo set que ofrece el selector del alta de negocio,
// así el fondo va mostrando justo lo que alguien puede llegar a registrar.
const GIRO_ICONS = {
    mascotas: PiPawPrintBold,
    unas: PiPaintBrushBold,
    pestanas: PiMagicWandBold,
    spa: PiFlowerLotusBold,
    barberia: PiScissorsBold,
    clinica: PiStethoscopeBold,
    gimnasio: PiBarbellBold,
};
const GIROS = Object.entries(GIRO_PRESETS).map(([value, preset]) => ({
    value, icon: GIRO_ICONS[value] || PiCalendarCheckBold, label: preset.label,
    img: GIRO_MARKETING[value].img,
}));

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

// Carrusel de funciones — scroll-snap horizontal con arrastre de mouse,
// flechas y puntos de progreso. Reemplaza la grilla de tarjetas de texto
// plana: cada tarjeta ahora es su propio panel a color, más cerca de cómo
// se presentan las funciones en un producto que de una lista de viñetas.
const FeatureCarousel = () => {
    const trackRef = useRef(null);
    const [active, setActive] = useState(0);
    const drag = useRef(null);

    const cardStep = () => {
        const track = trackRef.current;
        if (!track) return 0;
        const card = track.querySelector('.pl-feature-card');
        if (!card) return 0;
        const style = getComputedStyle(track);
        return card.getBoundingClientRect().width + parseFloat(style.columnGap || style.gap || 0);
    };

    const scrollToIndex = (i) => {
        const track = trackRef.current;
        if (!track) return;
        const clamped = Math.max(0, Math.min(FEATURES.length - 1, i));
        track.scrollTo({ left: clamped * cardStep(), behavior: 'smooth' });
    };

    const onScroll = () => {
        const track = trackRef.current;
        if (!track) return;
        const step = cardStep();
        if (!step) return;
        setActive(Math.round(track.scrollLeft / step));
    };

    // Arrastrar con mouse en desktop — el scroll-snap táctil ya funciona
    // solo en móvil, pero un trackpad/mouse normal no tiene forma nativa de
    // desplazar horizontalmente sin esto.
    const onPointerDown = (e) => {
        const track = trackRef.current;
        if (!track) return;
        drag.current = { startX: e.clientX, startScroll: track.scrollLeft, moved: false };
        track.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        const track = trackRef.current;
        if (!track || !drag.current) return;
        const dx = e.clientX - drag.current.startX;
        if (Math.abs(dx) > 4) drag.current.moved = true;
        track.scrollLeft = drag.current.startScroll - dx;
    };
    const onPointerUp = () => { drag.current = null; };
    // Evita que un arrastre termine también disparando el :hover/click de la
    // tarjeta (no hay link adentro hoy, pero deja la puerta lista si se
    // agrega uno después).
    const onClickCapture = (e) => { if (drag.current?.moved) e.preventDefault(); };

    return (
        <div className="pl-fc">
            <div className="pl-fc-head">
                <h2>Todo lo que tu negocio necesita</h2>
                <div className="pl-fc-arrows">
                    <button type="button" aria-label="Anterior" onClick={() => scrollToIndex(active - 1)}><PiArrowLeftBold /></button>
                    <button type="button" aria-label="Siguiente" onClick={() => scrollToIndex(active + 1)}><PiArrowRightBold /></button>
                </div>
            </div>
            <div
                className="pl-fc-track"
                ref={trackRef}
                onScroll={onScroll}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onClickCapture={onClickCapture}
            >
                {FEATURES.map((f) => (
                    <div key={f.title} className={`pl-feature-card pl-feature-card--${f.theme}`}>
                        <div className="pl-feature-icon"><f.icon /></div>
                        <span className="pl-feature-tag">{f.tag}</span>
                        <h3>{f.title}</h3>
                        <p>{f.desc}</p>
                    </div>
                ))}
            </div>
            <div className="pl-fc-dots">
                {FEATURES.map((f, i) => (
                    <button
                        key={f.title} type="button" aria-label={`Ir a ${f.title}`}
                        className={`pl-fc-dot${i === active ? ' is-active' : ''}`}
                        onClick={() => scrollToIndex(i)}
                    />
                ))}
            </div>
        </div>
    );
};

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
                <span className="pl-logo">Emporio</span>
                <Link to="/mascotas/taylors" className="pl-header-link">Ver un negocio en vivo →</Link>
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
                        <Link to="/mascotas/taylors" className="pl-cta-secondary">Ver una demo</Link>
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
                    <FeatureCarousel />
                </section>

                <section className="pl-giros pl-reveal">
                    <h2>Se adapta a tu giro</h2>
                    <p className="pl-giros-sub">Emporio ajusta las herramientas y el catálogo según a qué te dedicas.</p>
                    <div className="pl-giros-grid">
                        {GIROS.map((g) => (
                            <Link key={g.value} to={`/${getGiroUrlLabel(g.value)}`} className="pl-giro-chip">
                                <g.icon /> <span>{g.label}</span>
                            </Link>
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
                <span>Emporio — hecho con 🐾 por CIBERCOM</span>
            </footer>
        </div>
    );
};

export default PerruchoLanding;
