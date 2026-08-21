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
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import ServiceCard from '../components/ServiceCard/ServiceCard';
import { formatMexPhone, whatsAppValidationError } from '../utils/formatPhone';
import { appointmentsApi } from '../api/apiClient';
import { getServiceIcon } from '../utils/serviceIcons';
import { OnboardingTour, useOnboarding } from '../components/shared/OnboardingTour';
import { useBusinessPath } from '../utils/businessPath';
import { getGiroMarketing } from '../config/giroMarketing';
import { todayLocalDateStr } from '../utils/dateLocal';
import perruchoMark from '../assets/perrucho-mark.svg';

// ─── Hook de navegación con auth ─────────────────────────────────────────────
// Multi-tenant: `destination` llega como ruta relativa al negocio actual
// (ej. '/servicios') — se antepone /:giro/:slug tomado de la URL en curso.
const useAuthAction = () => {
    const { isLoggedIn } = useAuth();
    const navigate = useNavigate();
    const { withBusinessPath } = useBusinessPath();
    return (destination) => {
        const target = withBusinessPath(destination);
        if (isLoggedIn) navigate(target);
        else navigate(withBusinessPath('/acceso'), { state: { from: target } });
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
    const [availableTimes, setAvailableTimes] = useState([]);
    const [fullSlots, setFullSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // El horario del día (y cuáles ya están llenos) ahora lo calcula el
    // servidor a partir de Settings.businessHours del negocio — antes era
    // un arreglo fijo hardcodeado aquí mismo, igual para todos los negocios
    // y sin noción de días cerrados (bug reportado por clientes reales de
    // Taylor's, y por el propio dueño al pedir horarios configurables).
    useEffect(() => {
        if (!form.date) { setAvailableTimes([]); setFullSlots([]); return; }
        setSlotsLoading(true);
        appointmentsApi.getAvailability(form.date)
            .then(res => { setAvailableTimes(res.slots || []); setFullSlots(res.fullSlots || []); })
            .catch(() => { setAvailableTimes([]); setFullSlots([]); })
            .finally(() => setSlotsLoading(false));
    }, [form.date]);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePhoneChange = (e) => {
        const formatted = formatMexPhone(e.target.value);
        setForm(prev => ({ ...prev, ownerPhone: formatted }));
        setPhoneError(formatted.length > 0 ? whatsAppValidationError(formatted) : '');
    };

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

    const minDate = todayLocalDateStr();

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
                            {!slotsLoading && form.date && availableTimes.length === 0 && (
                                <small className="field-hint">No atendemos ese día — elige otra fecha.</small>
                            )}
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
// Genérico a propósito — antes decía "tu mascota" sin importar el giro del
// negocio (bug real: un salón de uñas mostraba este mismo texto de Taylor's).
const DEFAULT_HOW_IT_WORKS_STEPS = [
    { icon: '🔍', title: 'Elige tu servicio',  description: 'Explora nuestro catálogo y selecciona lo que necesitas.' },
    { icon: '📅', title: 'Agenda tu cita',     description: 'Selecciona el día y hora que más te convenga. Confirmación inmediata.' },
    { icon: '✅', title: '¡Ven y disfruta!',   description: 'Llega a tu cita y nosotros nos encargamos del resto.' },
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
                <p className="how-subtitle">Reservar tu cita nunca fue tan fácil.</p>
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

// Sin fallback fabricado a propósito — mostrar "4000+ clientes felices" en
// un negocio recién registrado con cero clientes reales no era solo mal
// branding (eran, literalmente, los números reales de Taylor's). Sin stats
// configuradas en Personalización, la franja completa no se renderiza en
// vez de inventar cifras.
const TrustStrip = ({ settings }) => {
    const rawStats = settings?.stats?.length ? settings.stats : [];
    if (!rawStats.length) return null;
    const STATS = rawStats.map(s => ({ ...parseStatValue(s.value), label: s.label, icon: s.icon }));
    return (
        <div className="trust-strip">
            {STATS.map((s, i) => <TrustStatItem key={i} {...s} />)}
        </div>
    );
};

// ─── ¿Por qué nosotros? ───────────────────────────────────────────────────────
// Genérico a propósito (antes era el "por qué elegirnos" real de Taylor's,
// incluida "venta de alimento" y "paseos" — sin sentido para otro giro).
const FEATURES = [
    { icon: '⭐', title: 'Calidad garantizada', desc: 'Servicio profesional con atención al detalle en cada cita.' },
    { icon: '📅', title: 'Agenda en línea', desc: 'Reserva tu cita en segundos desde cualquier dispositivo. Fácil y sin complicaciones.' },
    { icon: '👥', title: 'Equipo capacitado', desc: 'Personal en constante formación para brindarte el mejor servicio.' },
    { icon: '💳', title: 'Pago sencillo', desc: 'Cobra y recibe tu recibo al instante, sin complicaciones.' },
];

const WhyUsSection = ({ settings }) => {
    const features = settings?.whyUsFeatures?.length ? settings.whyUsFeatures : FEATURES;
    return (
        <section className="content-section why-us-section">
            <h3>{settings?.whyUsTitle || '¿Por qué elegirnos?'}</h3>
            <p className="section-sub">
                {settings?.whyUsSubtitle || 'Comprometidos con darte un servicio profesional, puntual y de calidad.'}
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
// h2 antes 100% hardcodeado (ni siquiera leía settings) — mismo bug que el
// resto: el texto de Taylor's aparecía en cualquier negocio.
const CTASection = ({ onBookingExpress, showGuestBooking, settings }) => {
    const authAction = useAuthAction();
    const { withBusinessPath } = useBusinessPath();
    return (
        <section className="cta-section">
            <div className="cta-inner">
                <h2>{settings?.slogan || '¡Agenda tu próxima cita!'}</h2>
                <p>Agenda tu cita hoy y descubre la diferencia de un servicio profesional.</p>
                <div className="cta-buttons">
                    <button className="cta-btn cta-primary" onClick={() => authAction('/servicios')}>
                        Reservar cita
                    </button>
                    {showGuestBooking && (
                        <button className="cta-btn cta-secondary" onClick={onBookingExpress}>
                            Reserva rápida
                        </button>
                    )}
                    <Link to={withBusinessPath('/sobre-nosotros')} className="cta-btn cta-secondary">
                        Conócenos
                    </Link>
                </div>
            </div>
        </section>
    );
};

// Genérico a propósito — antes decía "tu mascota" sin importar el giro
// (bug real: un salón de uñas o barbería mostraba este mismo texto).
const CLIENT_ONBOARDING_STEPS = [
    {icon:'👋',title:'¡Bienvenido!',description:'Creaste tu cuenta con éxito. Te mostramos rápido dónde está cada cosa.'},
    {icon:'📅',title:'Reservar cita',description:'Desde aquí agendas tu cita en minutos.',target:'[data-tour="home-reservar"]'},
    {icon:'✂️',title:'Servicios',description:'Consulta todos nuestros servicios y sus precios.',target:'[data-tour="nav-servicios"]'},
    {icon:'🛍️',title:'Tienda',description:'Compra productos directamente desde aquí.',target:'[data-tour="nav-tienda"]'},
    {icon:'👤',title:'Tu perfil',description:'Aquí ves tus citas y tus compras.',target:'[data-tour="nav-perfil"]'},
];

// ─── Página principal ─────────────────────────────────────────────────────────
const Home = () => {
    const { isLoggedIn, user } = useAuth();
    const { services, products, loading, settings } = useData();
    const authAction = useAuthAction();
    const navigate = useNavigate();
    const { withBusinessPath } = useBusinessPath();
    const [showBookingExpress, setShowBookingExpress] = useState(false);
    const isNewClient = isLoggedIn && user?.role === 'cliente';
    const { show: showOnboarding, dismiss: dismissOnboarding } = useOnboarding('client', isNewClient ? user?.id : null);

    // El toggle viene de settings (admin puede apagarlo)
    const guestBookingEnabled = settings?.allowGuestBooking !== false;

    // Giro alimentos en modo mostrador (sin reservar mesa): no hay "cita"
    // que agendar — el catálogo de Servicios se usa como menú, así que el
    // CTA principal lleva directo ahí, sin el candado de login que sí tiene
    // "Reservar cita" (ver el propio Home.jsx un poco más abajo).
    const isCounterService = settings?.giro === 'alimentos' && !settings?.enableTableReservations;

    // Bug real (reportado en Emporio Uñas/Pestañas): sin heroImageUrl propio,
    // el fallback era el video de Taylor's (bannerImage/heroVideo, sus
    // propios assets) — cualquier negocio nuevo mostraba grooming de perros
    // en su portada. El fallback ahora es la foto de stock de SU giro (la
    // misma que ya usa su landing de giro), nunca la de Taylor's. Taylor's
    // no pasa por este fallback — siempre tiene su propio heroImageUrl en
    // Settings — así que esto no le cambia nada.
    const heroFallbackImg = getGiroMarketing(settings?.giro).img;

    return (
        <div className="home-page-container">

            {showOnboarding && isNewClient && <OnboardingTour steps={CLIENT_ONBOARDING_STEPS} onClose={dismissOnboarding} />}

            {/* ── HERO CON IMAGEN (la del admin, o si no la de su giro) ── */}
            <div className="capsule-banner">
                <img src={settings?.heroImageUrl || heroFallbackImg} alt="" className="hero-video" />
                {isLoggedIn && user && (
                    <div className="hero-welcome-badge">
                        Bienvenido de nuevo, <span>{user.name.split(' ')[0]}</span> 👋
                    </div>
                )}
                <div className="hero-copy">
                    <img src={settings?.logoUrl || perruchoMark} alt={settings?.businessName || 'Perrucho'} className="hero-logo" />
                    <p className="hero-tagline">{settings?.heroTagline || 'Grooming · Tienda · Guardería · Paseos'}</p>
                    <h1 className="hero-title">{settings?.slogan || 'Reserva tu cita en minutos'}</h1>
                    <p className="hero-subtitle">
                        {settings?.heroSubtitle || 'Baño, corte, arreglo de uñas y más. Agenda tu cita en minutos.'}
                    </p>
                    <div className="hero-actions">
                        {isCounterService ? (
                            <button className="reserve-button hero-cta-main" data-tour="home-reservar" onClick={() => navigate(withBusinessPath('/servicios'))}>
                                Ver menú
                            </button>
                        ) : (
                            <>
                                <button className="reserve-button hero-cta-main" data-tour="home-reservar" onClick={() => authAction('/servicios')}>
                                    Reservar cita
                                </button>
                                {guestBookingEnabled && (
                                    <button className="hero-cta-secondary" onClick={() => setShowBookingExpress(true)}>
                                        Reserva rápida →
                                    </button>
                                )}
                            </>
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
                    {settings?.heroTagline || 'Conoce lo que ofrecemos'}
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
                    Descubre nuestros productos
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
                settings={settings}
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
