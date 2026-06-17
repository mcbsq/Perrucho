// src/components/ServiceModal/ServiceModal.jsx
//
// FIX CRÍTICO (bug reportado por cliente):
// - clientRecord ya NO se busca en el array `clients` del DataContext, porque ese
//   array está vacío para usuarios con rol 'cliente' (DataContext solo lo carga
//   para admin/empleado). Antes esto causaba que myPets SIEMPRE saliera vacío
//   y el selector de mascota nunca mostrara nada al agendar.
// - Ahora se usa directamente `user.id` como ownerId/clientId, igual que en
//   Perfil.jsx — users y clients son la misma tabla, user.id ES el clientId.
//
// CAMBIOS según feedback del cliente (correo de revisión):
// - Se quita la selección de horario exacto. El cliente solo elige el DÍA;
//   el groomer fija la hora desde su calendario (interfaz empleado).
// - Se omite el precio/método de pago como dato definitivo en la confirmación;
//   ahora se muestra únicamente como referencia informativa, sin presentarlo
//   como un paso de "pago" — se reduce a una sola línea aclaratoria.
//
// CAMBIOS v3 (catálogo real):
// - Selector de mascota muestra el rango de peso correcto (6 rangos)
// - Precio referencial con calcServicePrice()

import React, { useState, useMemo } from 'react';
import {
    FaCalendarAlt, FaCheckCircle, FaTimes, FaPaw,
    FaChevronLeft, FaChevronRight, FaWhatsapp, FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { appointmentsApi } from '../../api/apiClient';
import { clientToShopOnBooking, openWhatsApp } from '../../utils/whatsappNotify';
import { calcServicePrice, weightRangeLabel } from '../../utils/pricingRules';
import '../../pages/Services.css';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES   = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ─── Mini Calendario ──────────────────────────────────────────────────────────
const MiniCalendar = ({ selectedDate, onSelect }) => {
    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const firstDow    = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const isToday    = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    const isPast     = (d) => new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isSelected = (d) => {
        if (!selectedDate || !d) return false;
        const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        return iso === selectedDate;
    };

    const handleClick = (d) => {
        if (!d || isPast(d)) return;
        const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        onSelect(iso);
    };

    return (
        <div className="sm-calendar">
            <div className="sm-cal-header">
                <button className="sm-cal-nav" type="button" onClick={prevMonth}><FaChevronLeft /></button>
                <span className="sm-cal-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <button className="sm-cal-nav" type="button" onClick={nextMonth}><FaChevronRight /></button>
            </div>
            <div className="sm-cal-grid">
                {DAY_NAMES.map(d => <div key={d} className="sm-cal-dow">{d}</div>)}
                {cells.map((d, i) => (
                    <button
                        key={i}
                        className={[
                            'sm-cal-cell',
                            !d              ? 'empty'    : '',
                            d && isPast(d)  ? 'past'     : '',
                            d && isToday(d) ? 'today'    : '',
                            d && isSelected(d) ? 'selected' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleClick(d)}
                        disabled={!d || isPast(d)}
                        type="button"
                    >
                        {d || ''}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const ServiceModal = ({ service, onClose }) => {
    const { user }      = useAuth();
    const { addSale }   = useData();

    const [step,        setStep]        = useState(1);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [myPets,      setMyPets]      = useState([]);
    const [petsLoading, setPetsLoading] = useState(true);
    const [bookingData, setBookingData] = useState({ petId: '', date: '' });
    const [savedBooking, setSavedBooking] = useState(null);

    // FIX: cargar mascotas directamente por user.id — sin depender de `clients`
    // del DataContext, que para rol 'cliente' siempre está vacío.
    React.useEffect(() => {
        if (!user?.id) { setPetsLoading(false); return; }
        import('../../api/apiClient').then(({ petsApi }) => {
            petsApi.getByOwner(user.id)
                .then(setMyPets)
                .catch(() => setMyPets([]))
                .finally(() => setPetsLoading(false));
        });
    }, [user]);

    const selectedPet = myPets.find(p => String(p.id) === String(bookingData.petId));

    // Precio referencial — ya no se presenta como paso de "pago"
    const finalPrice  = calcServicePrice(service, selectedPet?.weight);
    const rangeLabel  = selectedPet ? weightRangeLabel(selectedPet.weight) : '';

    const next = () => { setError(''); setStep(s => s + 1); };
    const prev = () => { setError(''); setStep(s => s - 1); };

    const handleConfirm = async () => {
        setLoading(true);
        setError('');
        try {
            const petName = selectedPet?.petName || 'Sin mascota';
            // FIX: el cliente solo sugiere el día — sin hora exacta.
            // El groomer fija la hora desde su calendario (EmployeeDashboard).
            await appointmentsApi.create({
                petId:       bookingData.petId ? Number(bookingData.petId) : null,
                petName,
                serviceId:   service.id,
                serviceName: service.title,
                clientId:    user?.id || null,
                date:        bookingData.date,
                time:        '', // el groomer la asigna al confirmar
                status:      'Pendiente',
                finalPrice,
                paymentMethod: '',
                assignedTo:  '',
                createdAt:   todayISO(),
            });
            setSavedBooking({
                clientName:  user?.name || 'Cliente',
                petName,
                serviceName: service.title,
                date:        bookingData.date,
            });
            next();
        } catch (e) {
            console.error(e);
            setError('Error al guardar la reserva. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleNotifyShop = () => {
        if (!savedBooking) return;
        const url = clientToShopOnBooking(savedBooking);
        openWhatsApp(url);
    };

    const progressPct = { 1: '33%', 2: '66%', 3: '100%' };

    const formatDateDisplay = (iso) => {
        if (!iso) return '';
        return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
    };

    return (
        <div className="sm-overlay" onClick={onClose}>
            <div className="sm-capsule" onClick={e => e.stopPropagation()}>

                <button className="sm-close" type="button" onClick={onClose}><FaTimes /></button>

                {step <= 3 && (
                    <>
                        <div className="sm-progress-track">
                            <div className="sm-progress-fill" style={{ width: progressPct[step] }} />
                        </div>
                        <div className="sm-steps-dots">
                            {[1,2,3].map(n => (
                                <div key={n} className={`sm-dot ${step >= n ? 'done' : ''} ${step === n ? 'current' : ''}`} />
                            ))}
                        </div>
                    </>
                )}

                {/* ── PASO 1: Servicio + mascota ── */}
                {step === 1 && (
                    <div className="sm-step fade-in">
                        <div className="sm-service-icon">{service.icon || '🐾'}</div>
                        <h2 className="sm-title">{service.title}</h2>
                        <p className="sm-desc">{service.description}</p>

                        {petsLoading ? (
                            <p className="sm-desc">Cargando tus mascotas...</p>
                        ) : myPets.length > 0 ? (
                            <div className="sm-field">
                                <label><FaPaw /> ¿Para cuál mascota?</label>
                                <select
                                    value={bookingData.petId}
                                    onChange={e => setBookingData({ ...bookingData, petId: e.target.value })}
                                >
                                    <option value="">Selecciona tu mascota</option>
                                    {myPets.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.petName}{p.weight
                                                ? ` — ${weightRangeLabel(p.weight)} (~${p.weight} kg)`
                                                : ' — peso por verificar'}
                                        </option>
                                    ))}
                                </select>
                                {selectedPet && (
                                    <small className="sm-info-note">
                                        <FaInfoCircle /> Costo de referencia: ${finalPrice} ({rangeLabel}).
                                        El costo final se determina al evaluar a tu mascota en sucursal.
                                    </small>
                                )}
                            </div>
                        ) : (
                            <div className="sm-no-pets">
                                <FaPaw />
                                <p>No tienes mascotas registradas aún.<br />Agrega una desde tu perfil para reservar.</p>
                            </div>
                        )}

                        <button
                            className="sm-btn-primary"
                            type="button"
                            onClick={next}
                            disabled={myPets.length > 0 && !bookingData.petId}
                        >
                            Elegir fecha →
                        </button>
                    </div>
                )}

                {/* ── PASO 2: Solo selección de DÍA — sin hora exacta ── */}
                {step === 2 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">¿Qué día te conviene?</h2>
                        <p className="sm-desc">
                            Elige el día que prefieras. Nuestro equipo confirmará el
                            horario disponible ese día y te avisará por WhatsApp.
                        </p>

                        <MiniCalendar
                            selectedDate={bookingData.date}
                            onSelect={date => setBookingData({ ...bookingData, date })}
                        />
                        {bookingData.date && (
                            <div className="sm-selected-date-label">
                                📅 {formatDateDisplay(bookingData.date)}
                            </div>
                        )}

                        <div className="sm-actions-dual">
                            <button className="sm-btn-secondary" type="button" onClick={prev}>← Atrás</button>
                            <button
                                className="sm-btn-primary"
                                type="button"
                                onClick={next}
                                disabled={!bookingData.date}
                            >
                                Continuar →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 3: Confirmación ── */}
                {step === 3 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">Revisar reserva</h2>
                        <p className="sm-desc">
                            Confirma los datos. Nuestro equipo te asignará un horario
                            disponible ese día y te avisará por WhatsApp.
                        </p>

                        <div className="sm-summary">
                            <div className="sm-summary-row">
                                <span>Servicio</span><strong>{service.title}</strong>
                            </div>
                            {selectedPet && (
                                <div className="sm-summary-row">
                                    <span>Mascota</span>
                                    <strong>
                                        {selectedPet.petName}
                                        {selectedPet.weight
                                            ? ` · ${weightRangeLabel(selectedPet.weight)}`
                                            : ''}
                                    </strong>
                                </div>
                            )}
                            <div className="sm-summary-row">
                                <span>Día sugerido</span>
                                <strong>{formatDateDisplay(bookingData.date)}</strong>
                            </div>
                        </div>

                        <div className="sm-info-box">
                            <FaInfoCircle />
                            <p>
                                El horario y el costo final se confirman en sucursal según
                                la evaluación de tu mascota. Te avisaremos por WhatsApp
                                en cuanto se asigne tu horario.
                            </p>
                        </div>

                        {error && <p className="sm-error">{error}</p>}

                        <div className="sm-actions-dual">
                            <button className="sm-btn-secondary" type="button" onClick={prev}>← Atrás</button>
                            <button
                                className="sm-btn-confirm"
                                type="button"
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? 'Reservando...' : '¡Reservar ahora!'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 4: Éxito ── */}
                {step === 4 && savedBooking && (
                    <div className="sm-step sm-success fade-in">
                        <div className="sm-success-icon">
                            <FaCheckCircle />
                        </div>
                        <h2 className="sm-title">¡Reserva enviada!</h2>
                        <p className="sm-desc">
                            Tu cita quedó registrada como <strong>Pendiente</strong> para el{' '}
                            <strong>{formatDateDisplay(savedBooking.date)}</strong>.<br />
                            Te avisaremos por WhatsApp en cuanto se confirme el horario.
                        </p>

                        <div className="sm-summary">
                            <div className="sm-summary-row">
                                <span>Servicio</span><strong>{savedBooking.serviceName}</strong>
                            </div>
                            <div className="sm-summary-row">
                                <span>Mascota</span><strong>{savedBooking.petName}</strong>
                            </div>
                        </div>

                        <button className="sm-btn-whatsapp" type="button" onClick={handleNotifyShop}>
                            <FaWhatsapp /> Avisar por WhatsApp a la estética
                        </button>

                        <button className="sm-btn-secondary" type="button" onClick={onClose} style={{ marginTop: 8 }}>
                            Cerrar
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ServiceModal;