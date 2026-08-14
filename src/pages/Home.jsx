// src/pages/Home.jsx
//
// FIX (feedback cliente): el botón "Confirmar por WhatsApp" no debe estar en
// la confirmación del CLIENTE — el cliente no tiene que confirmarle nada a la
// estética; es la estética quien confirma al cliente. Ese botón se quitó de
// BookingExpressModal. A cambio, el formulario de reserva rápida ahora pide
// el teléfono (WhatsApp) del dueño y lo guarda en la cita como guestPhone/
// guestName, para que el empleado/admin pueda usarlo al confirmar.

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Home.css';
import bannerImage from '../assets/1.jpg';
import heroVideo   from '../assets/hero.mp4';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import ServiceCard from '../components/ServiceCard/ServiceCard';
import { formatMexPhone, whatsAppValidationError } from '../utils/formatPhone';
import { appointmentsApi } from '../api/apiClient';
import { getServiceIcon } from '../utils/serviceIcons';
import { OnboardingTour, useOnboarding } from '../components/shared/OnboardingTour';
// Logo: pon tu archivo como src/assets/logo.png para activarlo
// import logoTPS from '../assets/logo.png';
const logoTPS = null;

// ─── Hook de navegación con auth ─────────────────────────────────────────────
// Multi-tenant: `destination` llega como ruta relativa al negocio actual
// (ej. '/servicios') — se antepone el slug tomado de la URL en curso.
const useAuthAction = () => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const businessSlug = location.pathname.split('/').filter(Boolean)[0] || '';
    return (destination) => {
        const target = `/${businessSlug}${destination}`;
        if (isLoggedIn) navigate(target);
        else navigate(`/${businessSlug}/acceso`, { state: { from: target } });
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
    const [fullSlots, setFullSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Consulta qué horarios ya están llenos ese día — sin esto, el selector
    // mostraba todos los horarios como disponibles aunque ya tuvieran cita
    // (bug reportado por clientes reales de Taylor's).
    useEffect(() => {
        if (!form.date) { setFullSlots([]); return; }
        setSlotsLoading(true);
        appointmentsApi.getAvailability(form.date)
            .then(res => setFullSlots(res.fullSlots || []))
            .catch(() => setFullSlots([]))
            .finally(() => setSlotsLoading(false));
    }, [form.date]);

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
                            {slotsLoading && <small className="field-hint">Consultando disponibilidad...</small>}
                            <div className="bx-time-grid">
                                {availableTimes.map(t => {
                                    const isFull = fullSlots.includes(t);
                                    return (
                                        <button key={t} type="button"
                                            className={`bx-time-slot ${form.time === t ? 'active' : ''} ${isFull ? 'bx-time-slot--full' : ''}`}
                                            disabled={isFull}
                                            title={isFull ? 'Sin disponibilidad' : t}
                                            onClick={() => setForm(prev => ({ ...prev, time: t }))}>
                                            {t}
                                        </button>
                                    );
                                })}
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
const DEFAULT_HOW_IT_WORKS_STEPS = [
    { icon: '🔍', title: 'Elige tu servicio',  description: 'Explora nuestro catálogo y selecciona el servicio que tu mascota necesita.' },
    { icon: '📅', title: 'Agenda tu cita',     description: 'Selecciona el día y hora que más te convenga. Confirmación inmediata.' },
    { icon: '🐾', title: '¡Ven y disfruta!',   description: 'Llega con tu mascota y nosotros nos encargamos del resto con amor.' },
];
const STEP_COLORS = ['blue', 'lavender', 'mint'];

const HowItWorksSection = ({ onBookingExpress, showGuestBooking, settings }) => {
    const authAction = useAuthAction();
    const rawSteps = settings?.howItWorksSteps?.length ? settings.howItWorksSteps : DEFAULT_HOW_IT_WORKS_STEPS;
    const STEPS = rawSteps.map((s, i) => ({
        num: String(i + 1).padStart(2, '0'),
        icon: s.icon,
        imageUrl: s.imageUrl,
        title: s.title,
        desc: s.description,
        color: STEP_COLORS[i % STEP_COLORS.length],
    }));
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
                                    {step.imageUrl
                                        ? <img src={step.imageUrl} alt="" className="how-step-image" />
                                        : (() => { const StepIcon = getServiceIcon(step.title); return <StepIcon className="how-step-icon" />; })()
                                    }
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
const TrustStatItem = ({ target, suffix, label }) => {
    const { count, ref } = useCountUp(target);
    const Icon = getServiceIcon(label);
    return (
        <div className="trust-item" ref={ref}>
            <span className="trust-icon"><Icon /></span>
            <span className="trust-num">{count}{suffix}</span>
            <span className="trust-label">{label}</span>
        </div>
    );
};

// ─── Franja de confianza ──────────────────────────────────────────────────────
// stat.value puede ser "4000+" o "5★" — se separa el número del sufijo para
// mantener la animación de conteo.
const parseStatValue = (raw) => {
    const match = String(raw || '').match(/^(\d+)(.*)$/);
    if (!match) return { target: 0, suffix: String(raw || '') };
    return { target: Number(match[1]), suffix: match[2] || '' };
};

const DEFAULT_STATS = [
    { value: '4000+', label: 'Clientes felices', icon: '😊' },
    { value: '5★', label: 'Calificación', icon: '⭐' },
    { value: '3', label: 'Especialistas', icon: '👨‍⚕️' },
    { value: '10+', label: 'Años de experiencia', icon: '🏆' },
];

const TrustStrip = ({ settings }) => {
    const rawStats = settings?.stats?.length ? settings.stats : DEFAULT_STATS;
    const STATS = rawStats.map(s => ({ ...parseStatValue(s.value), label: s.label, icon: s.icon }));
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

const WhyUsSection = ({ settings }) => {
    const features = settings?.whyUsFeatures?.length ? settings.whyUsFeatures : FEATURES;
    return (
        <section className="content-section why-us-section">
            <h3>{settings?.whyUsTitle || '¿Por qué elegirnos?'}</h3>
            <p className="section-sub">
                {settings?.whyUsSubtitle || 'Somos una empresa establecida con amplia experiencia. Personal capacitado y en constante formación para brindarte a ti y a tu mejor amigo el servicio que merecen.'}
            </p>
            <div className="features-grid">
                {features.map((f, i) => {
                    const Icon = getServiceIcon(f.title);
                    return (
                        <div className="feature-card" key={f.title || i}>
                            <div className="feature-icon"><Icon /></div>
                            <h4>{f.title}</h4>
                            <p>{f.desc}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

// ─── Card de producto destacado ───────────────────────────────────────────────
const ProductCard = ({ item }) => {
    const authAction = useAuthAction();
    const Icon = getServiceIcon(item.category || item.name);
    return (
        <div className="service-card product-card">
            {item.imageUrl
                ? <img src={item.imageUrl} alt="" className="product-photo" />
                : <div className="service-icon product-icon"><Icon /></div>
            }
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
    const location = useLocation();
    const businessSlug = location.pathname.split('/').filter(Boolean)[0] || '';
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
                    <Link to={`/${businessSlug}/sobre-nosotros`} className="cta-btn cta-secondary">
                        Conócenos
                    </Link>
                </div>
            </div>
        </section>
    );
};

const CLIENT_ONBOARDING_STEPS = [
    {icon:'👋',title:'¡Bienvenido a Taylor\'s!',description:'Creaste tu cuenta con éxito. Te mostramos rápido dónde está cada cosa.'},
    {icon:'📅',title:'Reservar cita',description:'Desde aquí agendas una cita para tu mascota en minutos.',target:'[data-tour="home-reservar"]'},
    {icon:'✂️',title:'Servicios',description:'Consulta todos nuestros servicios y sus precios por tamaño de mascota.',target:'[data-tour="nav-servicios"]'},
    {icon:'🛍️',title:'Tienda',description:'Compra productos para tu mascota directamente desde aquí.',target:'[data-tour="nav-tienda"]'},
    {icon:'👤',title:'Tu perfil',description:'Aquí ves tus citas, tus compras y los datos de tus mascotas.',target:'[data-tour="nav-perfil"]'},
];

// ─── Página principal ─────────────────────────────────────────────────────────
const Home = () => {
    const { isLoggedIn, user } = useAuth();
    const { services, products, loading, settings } = useData();
    const authAction = useAuthAction();
    const [showBookingExpress, setShowBookingExpress] = useState(false);
    const isNewClient = isLoggedIn && user?.role === 'cliente';
    const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding('client', isNewClient ? user?.id : null);

    // El toggle viene de settings (admin puede apagarlo)
    const guestBookingEnabled = settings?.allowGuestBooking !== false;

    return (
        <div className="home-page-container">

            {showOnboarding && isNewClient && <OnboardingTour steps={CLIENT_ONBOARDING_STEPS} onClose={dismissOnboarding} />}

            {/* ── HERO CON VIDEO (o imagen si el admin eligió una) ── */}
            <div className="capsule-banner">
                {settings?.heroImageUrl
                    ? <img src={settings.heroImageUrl} alt="" className="hero-video" />
                    : <video className="hero-video" autoPlay muted loop playsInline poster={bannerImage}>
                        <source src={heroVideo} type="video/mp4" />
                    </video>
                }
                {isLoggedIn && user && (
                    <div className="hero-welcome-badge">
                        Bienvenido de nuevo, <span>{user.name.split(' ')[0]}</span> 👋
                    </div>
                )}
                <div className="hero-copy">
                    {/* Logo o nombre de marca */}
                    {settings?.logoUrl || logoTPS
                        ? <img src={settings?.logoUrl || logoTPS} alt={settings?.businessName || "Taylor's Pet Services"} className="hero-logo" />
                        : <p className="hero-brand-name">{settings?.businessName || "Taylor's Pet Services"}</p>
                    }
                    <p className="hero-tagline">{settings?.heroTagline || 'Grooming · Tienda · Guardería · Paseos'}</p>
                    <h1 className="hero-title">{settings?.slogan || 'El servicio que tú y tu mejor amigo merecen'}</h1>
                    <p className="hero-subtitle">
                        {settings?.heroSubtitle || 'Baño, corte, arreglo de uñas y más. Agenda tu cita en minutos.'}
                    </p>
                    <div className="hero-actions">
                        <button className="reserve-button hero-cta-main" data-tour="home-reservar" onClick={() => authAction('/servicios')}>
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
                settings={settings}
            />

            {/* ── FRANJA DE CONFIANZA ── */}
            <TrustStrip settings={settings} />

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
                    ) : services.filter(s => s.showOnHome !== false).length > 0 ? (
                        services.filter(s => s.showOnHome !== false).slice(0, 3).map(s => (
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
            <WhyUsSection settings={settings} />

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
