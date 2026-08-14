// src/pages/platform/PerruchoLanding.jsx
//
// Landing page de la PLATAFORMA Perrucho — antes la raíz del sitio
// redirigía directo a /taylors, lo cual tenía sentido con un solo negocio
// pero no ahora que Perrucho es multi-negocio (feedback real del cliente).
// Esta página explica el producto y lleva al alta de un negocio nuevo; cada
// negocio individual sigue viviendo en su propio /:businessSlug.
import React from 'react';
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

const GIROS = [
    { icon: PiPawPrintBold, label: 'Veterinaria y grooming' },
    { icon: PiPaintBrushBold, label: 'Uñas y pestañas' },
    { icon: PiFlowerLotusBold, label: 'Spa y bienestar' },
    { icon: PiScissorsBold, label: 'Barbería' },
    { icon: PiStethoscopeBold, label: 'Clínica' },
    { icon: PiBarbellBold, label: 'Gimnasio' },
];

const PerruchoLanding = () => (
    <div className="pl-page">
        <header className="pl-header">
            <span className="pl-logo">Perrucho</span>
            <Link to="/taylors" className="pl-header-link">Ver un negocio en vivo →</Link>
        </header>

        <section className="pl-hero">
            <span className="pl-eyebrow">Gratis mientras estamos en pruebas</span>
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
        </section>

        <section className="pl-features">
            {FEATURES.map((f) => (
                <div key={f.title} className="pl-feature-card">
                    <div className="pl-feature-icon"><f.icon /></div>
                    <h3>{f.title}</h3>
                    <p>{f.desc}</p>
                </div>
            ))}
        </section>

        <section className="pl-giros">
            <h2>Se adapta a tu giro</h2>
            <p className="pl-giros-sub">Perrucho ajusta las herramientas y el catálogo según a qué te dedicas.</p>
            <div className="pl-giros-grid">
                {GIROS.map((g) => (
                    <div key={g.label} className="pl-giro-chip">
                        <g.icon /> <span>{g.label}</span>
                    </div>
                ))}
            </div>
        </section>

        <section className="pl-cta-final">
            <h2>¿Listo para digitalizar tu negocio?</h2>
            <Link to="/crear-negocio" className="pl-cta-primary">
                Regístrate gratis <PiArrowRightBold />
            </Link>
        </section>

        <footer className="pl-footer">
            <span>Perrucho — hecho con 🐾 por CIBERCOM</span>
        </footer>
    </div>
);

export default PerruchoLanding;
