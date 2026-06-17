// src/pages/Home.jsx
//
// FIX (feedback cliente): el botón "Confirmar por WhatsApp" no debe estar en
// la confirmación del CLIENTE — el cliente no tiene que confirmarle nada a la
// estética; es la estética quien confirma al cliente. Ese botón se quitó de
// BookingExpressModal. A cambio, el formulario de reserva rápida ahora pide
// el teléfono (WhatsApp) del dueño y lo guarda en la cita como guestPhone/
// guestName, para que el empleado/admin pueda usarlo al confirmar.

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import bannerImage from '../assets/1.jpg';
import heroVideo   from '../assets/hero.mp4';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import ServiceCard from '../components/ServiceCard/ServiceCard';
import { formatMexPhone, whatsAppValidationError } from '../utils/formatPhone';
// Logo: pon tu archivo como src/assets/logo.png para activarlo
// import logoTPS from '../assets/logo.png';
const logoTPS = null;

// ─── Hook de navegación con auth ─────────────────────────────────────────────
const useAuthAction = () => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    return (destination) => {
        if (isLoggedIn) navigate(destination);
        else navigate('/acceso', { state: { from: destination } });
    };
};

// ─── Hook: contador animado al entrar en pantalla ─────────────────────────────
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
                    const ease     = 1 - Math.pow(1 - progress, 3);
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

// ─── Booking Express Pop-up ───────────────────────────────────────────────────
const BookingExpressModal = ({ onClose, settings }) => {
    const { addAppointment } = useData();
    const [step, setStep]   = useState(1); // 1: datos, 2: servicio/fecha, 3: éxito
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [form, setForm]     = useState({
        ownerName: '', ownerPhone: '', petName: '', breed: '', age: '', weight: '',
        date: '', time: '',
    });

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePhoneChange = (e) => {
        const formatted = formatMexPhone(e.target.value);
        setForm(prev => ({ ...prev, ownerPhone: formatted }));
        setPhoneError(formatted.length > 0 ? whatsAppValidationError(formatted) : '');
    };

    const availableTimes = [
        '10:15','11:00','11:45','12:30','13:15','14:00','14:45','15:30','16:15','17:00'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.ownerName || !form.petName) { setError('Nombre del dueño y mascota son requeridos.'); return; }
        if (step === 1) {
            const waErr = whatsAppValidationError(form.ownerPhone);
            if (waErr) { setPhoneError(waErr); setError('Ingresa un WhatsApp válido (10 dígitos) para poder confirmarte la cita.'); return; }
            setStep(2); setError(''); return;
        }

        if (!form.date || !form.time) { setError('Selecciona fecha y horario.'); return; }
        setLoading(true);
        try {
            // Crear cita sin cuenta (guest booking) — guarda guestName/guestPhone
            // para que el empleado/admin pueda confirmar por WhatsApp con el dueño.
            await addAppointment({
                clientId:    null,
                petId:       null,
                serviceId:   null,
                date:        form.date,
                time:        form.time,
                status:      'Pendiente',
                finalPrice:  0,
                guestName:   form.ownerName,
                guestPhone:  form.ownerPhone,
                notes:       `BOOKING EXPRESS — Mascota: ${form.petName} | Raza: ${form.breed || 'N/D'} | Edad: ${form.age || 'N/D'} | Peso aprox: ${form.weight || 'N/D'} kg`,
            });
            setStep(3);
        } catch {
            setError('Hubo un error al registrar tu cita. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const minDate = new Date().toISOString().split('T')[0];

    return (
        <div className="bx-overlay" onClick={onClose}>
            <div className="bx-modal" onClick={e => e.stopPropagation()}>
                <button className="bx-close" onClick={onClose}>✕</button>

                {step < 3 && (
                    <div className="bx-progress">
                        <div className="bx-progress-fill" style={{ width: step === 1 ? '50%' : '100%' }} />
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleSubmit}>
                        <div className="bx-icon">🐾</div>
                        <h2 className="bx-title">Reserva rápida</h2>
                        <p className="bx-subtitle">Sin necesidad de crear cuenta. Solo dinos quiénes son.</p>
                        <div className="bx-field">
                            <label>Nombre del dueño *</label>
                            <input name="ownerName" value={form.ownerName} onChange={handleChange} placeholder="Tu nombre completo" required />
                        </div>
                        <div className="bx-field">
                            <label>WhatsApp (10 dígitos) * 📱</label>
                            <input name="ownerPhone" value={form.ownerPhone} onChange={handlePhoneChange}
                                placeholder="tu numero a 10 digitos" inputMode="numeric" required />
                            {phoneError && <small className="field-hint field-hint--error">{phoneError}</small>}
                            {!phoneError && form.ownerPhone && <small className="field-hint field-hint--ok">✓ Número válido</small>}
                            <small className="field-hint">Lo usaremos para confirmarte la cita por WhatsApp.</small>
                        </div>
                        <div className="bx-field">
                            <label>Nombre de tu mascota *</label>
                            <input name="petName" value={form.petName} onChange={handleChange} placeholder="¿Cómo se llama?" required />
                        </div>
                        <div className="bx-row">
                            <div className="bx-field">
                                <label>Raza</label>
                                <input name="breed" value={form.breed} onChange={handleChange} placeholder="Ej: Poodle" />
                            </div>
                            <div className="bx-field">
                                <label>Peso aprox. (kg)</label>
                                <input name="weight" value={form.weight} onChange={handleChange} type="number" step="0.1" placeholder="Ej: 5" />
                            </div>
                        </div>
                        <div className="bx-field">
                            <label>Edad aproximada</label>
                            <input name="age" value={form.age} onChange={handleChange} placeholder="Ej: 2 años" />
                        </div>
                        {error && <p className="bx-error">{error}</p>}
                        <button type="submit" className="bx-btn-primary">Siguiente →</button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleSubmit}>
                        <div className="bx-icon">📅</div>
                        <h2 className="bx-title">¿Cuándo los vemos?</h2>
                        <p className="bx-subtitle">Elige el día y horario que más te convenga.</p>
                        <div className="bx-field">
                            <label>Fecha *</label>
                            <input name="date" type="date" value={form.date} min={minDate}
                                onChange={handleChange} required />
                        </div>
                        <div className="bx-field">
                            <label>Horario *</label>
                            <div className="bx-time-grid">
                                {availableTimes.map(t => (
                                    <button key={t} type="button"
                                        className={`bx-time-slot ${form.time === t ? 'active' : ''}`}
                                        onClick={() => setForm(prev => ({ ...prev, time: t }))}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {error && <p className="bx-error">{error}</p>}
                        <div className="bx-actions">
                            <button type="button" className="bx-btn-secondary" onClick={() => setStep(1)}>← Atrás</button>
                            <button type="submit" className="bx-btn-primary" disabled={loading}>
                                {loading ? 'Registrando...' : 'Confirmar cita'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="bx-success">
                        <div className="bx-success-icon">✅</div>
                        <h2 className="bx-title">¡Cita registrada!</h2>
                        <p className="bx-subtitle">
                            Hemos recibido tu solicitud para <strong>{form.petName}</strong> el <strong>{form.date}</strong> a las <strong>{form.time}</strong>.
                        </p>
                        <p className="bx-subtitle" style={{ marginTop: 8 }}>
                            Te confirmaremos por WhatsApp al número que nos compartiste.
                        </p>
                        <button className="bx-btn-secondary" onClick={onClose} style={{ marginTop: 12 }}>
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Sección "Cómo funciona" ──────────────────────────────────────────────────
const HowItWorksSection = ({ onBookingExpress, showGuestBooking }) => {
    const authAction = useAuthAction();
    const STEPS = [
        { num: '01', icon: '🔍', title: 'Elige tu servicio',  desc: 'Explora nuestro catálogo y selecciona el servicio que tu mascota necesita.', color: 'blue'     },
        { num: '02', icon: '📅', title: 'Agenda tu cita',     desc: 'Selecciona el día y hora que más te convenga. Confirmación inmediata.',       color: 'lavender' },
        { num: '03', icon: '🐾', title: '¡Ven y disfruta!',   desc: 'Llega con tu mascota y nosotros nos encargamos del resto con amor.',          color: 'mint'     },
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
                <div className="how-cta-group">
                    <button className="how-cta" onClick={() => authAction('/servicios')}>
                        Reservar con cuenta →
                    </button>
                    {showGuestBooking && (
                        <button className="how-cta how-cta--secondary" onClick={onBookingExpress}>
                            Reserva rápida sin cuenta
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

// ─── Ítem de stat ─────────────────────────────────────────────────────────────
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
        { target: 4000, suffix: '+', label: 'Clientes felices',    icon: '😊' },
        { target: 5,    suffix: '★', label: 'Calificación',        icon: '⭐' },
        { target: 3,    suffix: '',  label: 'Especialistas',       icon: '👨‍⚕️' },
        { target: 10,   suffix: '+', label: 'Años de experiencia', icon: '🏆' },
    ];
    return (
        <div className="trust-strip">
            {STATS.map((s, i) => <TrustStatItem key={i} {...s} />)}
        </div>
    );
};

// ─── ¿Por qué nosotros? ───────────────────────────────────────────────────────
const FEATURES = [
    { icon: '✂️', title: 'Estética premium',         desc: 'Cortes, baños y tratamientos con productos cosméticos de alta gama garantizando calidad y cuidado.' },
    { icon: '🛍️', title: 'Venta de alimento',         desc: 'Alimento de calidad a la puerta de tu casa. Pregunta por nuestro servicio a domicilio.' },
    { icon: '🐕', title: 'Servicio de paseos',        desc: 'Tu mejor amigo merece ejercicio y diversión. Contamos con paseadores certificados.' },
    { icon: '📅', title: 'Agenda en línea',           desc: 'Reserva tu cita en segundos desde cualquier dispositivo. Fácil y sin complicaciones.' },
];

const WhyUsSection = () => (
    <section className="content-section why-us-section">
        <h3>¿Por qué elegirnos?</h3>
        <p className="section-sub">
            Somos una empresa establecida con amplia experiencia. Personal capacitado y en constante formación para brindarte a ti y a tu mejor amigo el servicio que merecen.
        </p>
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

// ─── Card de producto destacado ───────────────────────────────────────────────
const ProductCard = ({ item }) => {
    const authAction = useAuthAction();
    const icon = item.icon || (item.category?.includes('Aliment') ? '🍖' : item.category?.includes('Higien') ? '🛁' : '🎁');
    return (
        <div className="service-card product-card">
            <div className="service-icon product-icon">{icon}</div>
            <h3>{item.name}</h3>
            <p>{item.description || `Categoría: ${item.category}`}</p>
            <button className="reserve-button buy-button" onClick={() => authAction('/tienda')}>
                Ver en tienda
            </button>
        </div>
    );
};

// ─── CTA final ────────────────────────────────────────────────────────────────
const CTASection = ({ onBookingExpress, showGuestBooking }) => {
    const authAction = useAuthAction();
    return (
        <section className="cta-section">
            <div className="cta-inner">
                <h2>El servicio que tú y tu mejor amigo merecen</h2>
                <p>Agenda tu cita hoy y descubre la diferencia de un servicio profesional con amor.</p>
                <div className="cta-buttons">
                    <button className="cta-btn cta-primary" onClick={() => authAction('/servicios')}>
                        Reservar cita
                    </button>
                    {showGuestBooking && (
                        <button className="cta-btn cta-secondary" onClick={onBookingExpress}>
                            Reserva rápida
                        </button>
                    )}
                    <Link to="/sobre-nosotros" className="cta-btn cta-secondary">
                        Conócenos
                    </Link>
                </div>
            </div>
        </section>
    );
};

// ─── Página principal ─────────────────────────────────────────────────────────
const Home = () => {
    const { isLoggedIn, user } = useAuth();
    const { services, products, loading, settings } = useData();
    const authAction = useAuthAction();
    const [showBookingExpress, setShowBookingExpress] = useState(false);

    // El toggle viene de settings (admin puede apagarlo)
    const guestBookingEnabled = settings?.allowGuestBooking !== false;

    return (
        <div className="home-page-container">

            {/* ── HERO CON VIDEO ── */}
            <div className="capsule-banner">
                <video className="hero-video" autoPlay muted loop playsInline poster={bannerImage}>
                    <source src={heroVideo} type="video/mp4" />
                </video>
                {isLoggedIn && user && (
                    <div className="hero-welcome-badge">
                        Bienvenido de nuevo, <span>{user.name.split(' ')[0]}</span> 👋
                    </div>
                )}
                <div className="hero-copy">
                    {/* Logo o nombre de marca */}
                    {logoTPS
                        ? <img src={logoTPS} alt="Taylor's Pet Services" className="hero-logo" />
                        : <p className="hero-brand-name">Taylor's Pet Services</p>
                    }
                    <p className="hero-tagline">Grooming · Tienda · Guardería · Paseos</p>
                    <h1 className="hero-title">El servicio que tú y tu mejor amigo merecen</h1>
                    <p className="hero-subtitle">
                        Baño, corte, arreglo de uñas y más. Agenda tu cita en minutos.
                    </p>
                    <div className="hero-actions">
                        <button className="reserve-button hero-cta-main" onClick={() => authAction('/servicios')}>
                            Reservar cita
                        </button>
                        {guestBookingEnabled && (
                            <button className="hero-cta-secondary" onClick={() => setShowBookingExpress(true)}>
                                Reserva rápida →
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── CÓMO FUNCIONA ── */}
            <HowItWorksSection
                onBookingExpress={() => setShowBookingExpress(true)}
                showGuestBooking={guestBookingEnabled}
            />

            {/* ── FRANJA DE CONFIANZA ── */}
            <TrustStrip />

            {/* ── SERVICIOS DESDE LA BD ── */}
            <section className="content-section services-section">
                <p className="section-eyebrow">Lo que ofrecemos</p>
                <h3>Nuestros Servicios</h3>
                <p className="section-sub">
                    Grooming · Tienda · Guardería · Paseos
                </p>
                <div className="svc-cards-grid">
                    {loading ? (
                        <p className="svc-empty-msg">Cargando servicios...</p>
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
                        <p className="svc-empty-msg">Cargando servicios profesionales...</p>
                    )}
                </div>
            </section>

            {/* ── ¿POR QUÉ NOSOTROS? ── */}
            <WhyUsSection />

            {/* ── PRODUCTOS DESTACADOS ── */}
            <section className="content-section">
                <h3>Productos Destacados</h3>
                <p className="section-sub">
                    Paseos · Venta de alimento a domicilio · Guardería (próximamente)
                </p>
                <div className="service-cards-grid">
                    {products.length > 0 ? (
                        products.slice(0, 3).map(p => (
                            <ProductCard key={p.id} item={p} />
                        ))
                    ) : (
                        <p className="svc-empty-msg">Cargando productos exclusivos...</p>
                    )}
                </div>
            </section>

            {/* ── CTA FINAL ── */}
            <CTASection
                onBookingExpress={() => setShowBookingExpress(true)}
                showGuestBooking={guestBookingEnabled}
            />

            <div className="spacer-gradient" />

            {/* ── BOOKING EXPRESS POP-UP ── */}
            {showBookingExpress && (
                <BookingExpressModal
                    onClose={() => setShowBookingExpress(false)}
                    settings={settings}
                />
            )}
        </div>
    );
};

export default Home;
