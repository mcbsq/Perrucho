// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import bannerImage from '../assets/1.jpg';
import heroVideo   from '../assets/hero.mp4';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

// ─── Hook de autenticación ────────────────────────────────────────────────────
const useAuthAction = () => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    return (destination) => {
        if (isLoggedIn) navigate(destination);
        else navigate('/acceso', { state: { from: destination } });
    };
};

// ─── Hook: animación de número al entrar en pantalla ─────────────────────────
// IMPORTANTE: usado dentro de un componente hijo (TrustStatItem), no en .map()
const useCountUp = (target, duration = 1800) => {
    const [count, setCount] = useState(0);
    const ref  = useRef(null);
    const done = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !done.current) {
                done.current = true;
                const start = performance.now();
                const tick  = (now) => {
                    const progress = Math.min((now - start) / duration, 1);
                    const ease = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.floor(ease * target));
                    if (progress < 1) requestAnimationFrame(tick);
                    else setCount(target);
                };
                requestAnimationFrame(tick);
            }
        }, { threshold: 0.3 });
        observer.observe(el);
        return () => observer.disconnect();
    }, [target, duration]);

    return { count, ref };
};

// ─── Tarjeta de servicio — datos 100% desde la BD ────────────────────────────
const ServiceCard = ({ service, onReserve, isLoggedIn }) => {
    const [selectedSize, setSelectedSize] = useState('mediano');

    // Precios desde la BD — con fallback al cálculo si no existen
    const base = Number(service.price) || 0;
    const prices = {
        chico:   service.priceChico   ?? base,
        mediano: service.priceMediano ?? +(base * 1.25).toFixed(0),
        grande:  service.priceGrande  ?? +(base * 1.50).toFixed(0),
    };

    // Color e ícono desde la BD — con fallback por categoría
    const color = service.color || inferColor(service);
    const icon  = service.icon  || inferIcon(service);

    return (
        <div className={`svc-card svc-card--${color}`}>
            {service.popular && (
                <div className="svc-popular-badge">⭐ Más popular</div>
            )}
            <div className={`svc-icon-wrap svc-icon-wrap--${color}`}>
                <span className="svc-icon">{icon}</span>
            </div>
            <h3 className="svc-title">{service.title}</h3>
            <p className="svc-desc">{service.description || `Servicio de ${service.category}`}</p>
            {service.duration && (
                <span className="svc-duration">⏱ {service.duration}</span>
            )}
            <div className="svc-size-selector">
                {['chico','mediano','grande'].map(size => (
                    <button
                        key={size}
                        className={`svc-size-btn ${selectedSize === size ? 'active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                    >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                ))}
            </div>
            <div className={`svc-price-display svc-price-display--${color}`}>
                <span className="svc-price-label">Precio</span>
                <span className="svc-price-amount">${prices[selectedSize]}</span>
            </div>
            <button
                className={`svc-cta-btn svc-cta-btn--${color}`}
                onClick={() => onReserve(service)}
            >
                {isLoggedIn ? 'Reservar ahora' : 'Inicia sesión para reservar'}
            </button>
        </div>
    );
};

// ─── Fallbacks de color e ícono (solo si la BD no los trae) ──────────────────
function inferColor(service) {
    const cat   = (service.category || '').toLowerCase();
    const title = (service.title    || '').toLowerCase();
    if (title.includes('corte') || cat.includes('estét')) return 'lavender';
    if (title.includes('uña'))                            return 'mint';
    if (cat.includes('veter') || cat.includes('médic'))   return 'mint';
    return 'blue';
}

function inferIcon(service) {
    const cat   = (service.category || '').toLowerCase();
    const title = (service.title    || '').toLowerCase();
    if (title.includes('baño')  || cat.includes('higien')) return '🛁';
    if (title.includes('corte') || cat.includes('estét'))  return '✂️';
    if (title.includes('uña'))                             return '🐾';
    if (title.includes('vacun'))                           return '💉';
    if (cat.includes('veter')   || cat.includes('médic'))  return '🏥';
    return '🐾';
}

// ─── Sección "Cómo funciona" ──────────────────────────────────────────────────
const HowItWorksSection = () => {
    const authAction = useAuthAction();
    const STEPS = [
        { num:'01', icon:'🔍', title:'Elige tu servicio',  desc:'Explora nuestro catálogo y selecciona el servicio que tu mascota necesita.', color:'blue' },
        { num:'02', icon:'📅', title:'Agenda tu cita',     desc:'Selecciona el día y hora que más te convenga. Confirmación inmediata.',       color:'lavender' },
        { num:'03', icon:'🐾', title:'¡Ven y disfruta!',   desc:'Llega con tu mascota y nosotros nos encargamos del resto con amor.',          color:'mint' },
    ];
    return (
        <section className="how-section">
            <div className="how-inner">
                <p className="how-tagline">Así de sencillo</p>
                <h2 className="how-title">¿Cómo funciona?</h2>
                <p className="how-subtitle">Reservar una cita para tu mascota nunca fue tan fácil.</p>
                <div className="how-steps">
                    {STEPS.map((step, i) => (
                        <React.Fragment key={step.num}>
                            <div className={`how-step how-step--${step.color}`}>
                                <div className={`how-step-num how-step-num--${step.color}`}>{step.num}</div>
                                <div className={`how-step-icon-wrap how-step-icon-wrap--${step.color}`}>
                                    <span className="how-step-icon">{step.icon}</span>
                                </div>
                                <h4 className="how-step-title">{step.title}</h4>
                                <p className="how-step-desc">{step.desc}</p>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className="how-connector">
                                    <div className="how-connector-line" />
                                    <div className="how-connector-arrow">→</div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                <button className="how-cta" onClick={() => authAction('/servicios')}>
                    Reservar mi cita →
                </button>
            </div>
        </section>
    );
};

// ─── Ítem de stat individual (hook dentro de componente, no en .map) ──────────
const TrustStatItem = ({ target, suffix, label, icon }) => {
    const { count, ref } = useCountUp(target);
    return (
        <div className="trust-item" ref={ref}>
            <span className="trust-icon">{icon}</span>
            <span className="trust-num">{count}{suffix}</span>
            <span className="trust-label">{label}</span>
        </div>
    );
};

// ─── Franja de confianza ──────────────────────────────────────────────────────
const TrustStrip = () => {
    const STATS = [
        { target:500, suffix:'+', label:'Clientes felices',   icon:'😊' },
        { target:5,   suffix:'★', label:'Calificación',       icon:'⭐' },
        { target:3,   suffix:'',  label:'Especialistas',      icon:'👨‍⚕️' },
        { target:10,  suffix:'+', label:'Años de experiencia',icon:'🏆' },
    ];
    return (
        <div className="trust-strip">
            {STATS.map((s, i) => (
                <TrustStatItem key={i} {...s} />
            ))}
        </div>
    );
};

// ─── Sección "¿Por qué nosotros?" ────────────────────────────────────────────
const FEATURES = [
    { icon:'🏥', title:'Veterinaria certificada', desc:'Médicos veterinarios con cédula profesional y años de experiencia en pequeñas especies.' },
    { icon:'✂️', title:'Estética premium',        desc:'Cortes, baños y tratamientos con productos dermatológicos de alta calidad.' },
    { icon:'🛍️', title:'Tienda especializada',    desc:'Alimentos, accesorios y suplementos seleccionados por nuestros especialistas.' },
    { icon:'📅', title:'Agenda en línea',         desc:'Reserva tu cita en segundos y recibe recordatorios automáticos.' },
];

const WhyUsSection = () => (
    <section className="content-section why-us-section">
        <h3>¿Por qué elegirnos?</h3>
        <div className="features-grid">
            {FEATURES.map(f => (
                <div className="feature-card" key={f.title}>
                    <div className="feature-icon">{f.icon}</div>
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                </div>
            ))}
        </div>
    </section>
);

// ─── Tarjeta de producto ──────────────────────────────────────────────────────
const ProductCard = ({ item }) => {
    const authAction = useAuthAction();
    return (
        <div className="service-card product-card">
            <div className="service-icon product-icon">🎁</div>
            <h3>{item.name}</h3>
            <p>{`Categoría: ${item.category}`}</p>
            <button className="reserve-button buy-button" onClick={() => authAction('/tienda')}>
                Comprar
            </button>
        </div>
    );
};

// ─── CTA final ────────────────────────────────────────────────────────────────
const CTASection = () => {
    const authAction = useAuthAction();
    return (
        <section className="cta-section">
            <div className="cta-inner">
                <h2>Tu mascota merece lo mejor</h2>
                <p>Crea tu cuenta gratis y agenda la primera cita con descuento especial.</p>
                <div className="cta-buttons">
                    <button className="cta-btn cta-primary" onClick={() => authAction('/servicios')}>
                        Reservar cita
                    </button>
                    <Link to="/registro" className="cta-btn cta-secondary">
                        Crear cuenta
                    </Link>
                </div>
            </div>
        </section>
    );
};

// ─── Página principal ─────────────────────────────────────────────────────────
const Home = () => {
    const { isLoggedIn, user } = useAuth();
    const { services, products, loading } = useData();
    const authAction = useAuthAction();

    return (
        <div className="home-page-container">

            {/* ── HERO CON VIDEO ── */}
            <div className="capsule-banner">
                <video className="hero-video" autoPlay muted loop playsInline poster={bannerImage}>
                    <source src={heroVideo} type="video/mp4" />
                </video>
                {isLoggedIn && user && (
                    <div className="hero-welcome-badge">
                        Bienvenido de nuevo, <span>{user.name}</span> 👋
                    </div>
                )}
                <div className="hero-copy">
                    <p className="hero-tagline">Estética · Veterinaria · Tienda</p>
                    <h1 className="hero-title">El cuidado que<br />tu mascota merece</h1>
                    <p className="hero-subtitle">Confíenos a su mascota para consentirla y embellecerla.</p>
                    <div className="hero-actions">
                        <button className="reserve-button hero-cta-main" onClick={() => authAction('/servicios')}>
                            Reservar cita
                        </button>
                        <button className="hero-cta-secondary" onClick={() => authAction('/tienda')}>
                            Ver tienda →
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CÓMO FUNCIONA ── */}
            <HowItWorksSection />

            {/* ── FRANJA DE CONFIANZA ── */}
            <TrustStrip />

            {/* ── SERVICIOS DESDE LA BD ── */}
            <section className="content-section services-section">
                <p className="section-eyebrow">Lo que ofrecemos</p>
                <h3>Nuestros Servicios</h3>
                <p className="section-sub">
                    Selecciona el tamaño de tu mascota en cada tarjeta para ver el precio exacto.
                </p>
                <div className="svc-cards-grid">
                    {loading ? (
                        <p className="empty-msg">Cargando servicios...</p>
                    ) : services.length > 0 ? (
                        services.slice(0, 3).map(s => (
                            <ServiceCard
                                key={s.id}
                                service={s}
                                onReserve={() => authAction('/servicios')}
                                isLoggedIn={isLoggedIn}
                            />
                        ))
                    ) : (
                        <p className="empty-msg">Cargando servicios profesionales...</p>
                    )}
                </div>
            </section>

            {/* ── ¿POR QUÉ NOSOTROS? ── */}
            <WhyUsSection />

            {/* ── PRODUCTOS DESDE LA BD ── */}
            <section className="content-section">
                <h3>Productos Destacados</h3>
                <div className="service-cards-grid">
                    {products.length > 0 ? (
                        products.slice(0, 3).map(p => (
                            <ProductCard key={p.id} item={p} />
                        ))
                    ) : (
                        <p className="empty-msg">Cargando productos exclusivos...</p>
                    )}
                </div>
            </section>

            {/* ── CTA FINAL ── */}
            <CTASection />

            <div className="spacer-gradient" />
        </div>
    );
};

export default Home;