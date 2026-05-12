// src/components/ServiceModal/ServiceModal.jsx
//
// CAMBIOS v3 según catálogo real:
// 1. Slots de horario: 10:15, 11:00, 12:00...17:00 (antes 09:00-19:00)
// 2. Selector de mascota ahora muestra el rango de peso correcto (6 rangos)
//    y calcula el precio con calcServicePrice() en lugar del multiplicador genérico
// 3. El precio estimado muestra el rango exacto (Mini/Chico/Mediano/etc.)

import React, { useState, useMemo, useEffect } from 'react';
import {
    FaCalendarAlt, FaCheckCircle, FaTimes, FaPaw,
    FaChevronLeft, FaChevronRight, FaWhatsapp, FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { appointmentsApi } from '../../api/apiClient';
import { clientToShopOnBooking, openWhatsApp } from '../../utils/whatsappNotify';
import { calcServicePrice, weightRangeLabel, getWeightRange } from '../../utils/pricingRules';
import { getBookingSlots } from '../../utils/bookingRules';
import '../../pages/Services.css';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES   = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

// Slots según horario real del catálogo (10:15am a 5pm)
const ALL_SLOTS = getBookingSlots();

const fmt12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
};

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

// ─── Grid de horarios ─────────────────────────────────────────────────────────
const TimeGrid = ({ date, selectedTime, onSelect, busySlots }) => {
    if (!date) return (
        <div className="sm-time-empty">
            <FaCalendarAlt />
            <p>Selecciona un día para ver los horarios disponibles</p>
        </div>
    );

    return (
        <div className="sm-time-grid">
            {ALL_SLOTS.map(slot => {
                const busy     = busySlots.includes(slot);
                const isActive = selectedTime === slot;
                return (
                    <button
                        key={slot}
                        type="button"
                        className={[
                            'sm-time-slot',
                            busy     ? 'busy'   : 'free',
                            isActive ? 'active' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => !busy && onSelect(slot)}
                        disabled={busy}
                        title={busy ? 'Horario no disponible' : fmt12(slot)}
                    >
                        <span className="slot-time">{fmt12(slot)}</span>
                        <span className="slot-label">
                            {busy ? 'No disponible' : isActive ? '✓ Seleccionado' : 'Disponible'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const ServiceModal = ({ service, onClose }) => {
    const { user }                    = useAuth();
    const { pets, clients, addSale }  = useData();

    const [step,        setStep]        = useState(1);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [allAppts,    setAllAppts]    = useState([]);
    const [bookingData, setBookingData] = useState({ petId: '', date: '', time: '' });
    const [savedBooking, setSavedBooking] = useState(null);

    useEffect(() => {
        appointmentsApi.getAll().then(setAllAppts).catch(() => {});
    }, []);

    const busySlots = useMemo(() => {
        if (!bookingData.date) return [];
        return allAppts
            .filter(a => a.date === bookingData.date && a.status !== 'Cancelada')
            .map(a => a.time)
            .filter(Boolean);
    }, [allAppts, bookingData.date]);

    // Resolver cliente logueado
    const clientRecord = useMemo(() => {
        if (user?.clientId) {
            const byId = clients.find(c => String(c.id) === String(user.clientId));
            if (byId) return byId;
        }
        return clients.find(c => c.email?.toLowerCase() === user?.email?.toLowerCase());
    }, [clients, user]);

    const myPets = useMemo(() =>
        clientRecord ? pets.filter(p => String(p.ownerId) === String(clientRecord.id)) : [],
        [pets, clientRecord]
    );

    const selectedPet = myPets.find(p => String(p.id) === String(bookingData.petId));

    // Precio calculado con los 6 rangos reales
    const finalPrice  = calcServicePrice(service, selectedPet?.weight);
    const rangeLabel  = selectedPet ? weightRangeLabel(selectedPet.weight) : '';

    const next = () => { setError(''); setStep(s => s + 1); };
    const prev = () => { setError(''); setStep(s => s - 1); };

    const handleConfirm = async () => {
        setLoading(true);
        setError('');
        try {
            const petName = selectedPet?.petName || 'Sin mascota';
            await appointmentsApi.create({
                petId:       bookingData.petId ? Number(bookingData.petId) : null,
                petName,
                serviceId:   service.id,
                serviceName: service.title,
                clientId:    clientRecord?.id || null,
                date:        bookingData.date,
                time:        bookingData.time,
                status:      'Pendiente',
                finalPrice,
                paymentMethod: '',
                assignedTo:  '',
                createdAt:   todayISO(),
            });
            await addSale(
                `Reserva: ${service.title} (${petName})`,
                finalPrice,
                clientRecord?.id || null,
                'service'
            );
            setSavedBooking({
                clientName:  clientRecord?.name || user?.name || 'Cliente',
                petName,
                serviceName: service.title,
                date:        bookingData.date,
                time:        bookingData.time,
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

                        {myPets.length > 0 ? (
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
                                    <>
                                        <div className="sm-price-preview">
                                            <span>Precio estimado · {rangeLabel}</span>
                                            <strong>${finalPrice}</strong>
                                        </div>
                                        <small className="sm-info-note">
                                            <FaInfoCircle /> El precio final se ajusta según el peso real
                                            verificado en sucursal y las condiciones de la mascota.
                                        </small>
                                    </>
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
                            Elegir fecha y hora →
                        </button>
                    </div>
                )}

                {/* ── PASO 2: Calendario + horarios ── */}
                {step === 2 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">Elige tu fecha y hora</h2>
                        <p className="sm-desc">
                            Selecciona el día y la hora preferidos. El groomer confirmará
                            disponibilidad y podrá ajustar el horario según la carga del día.
                        </p>

                        <div className="sm-datetime-layout">
                            <div className="sm-datetime-left">
                                <MiniCalendar
                                    selectedDate={bookingData.date}
                                    onSelect={date => setBookingData({ ...bookingData, date, time: '' })}
                                />
                                {bookingData.date && (
                                    <div className="sm-selected-date-label">
                                        📅 {formatDateDisplay(bookingData.date)}
                                    </div>
                                )}
                            </div>

                            <div className="sm-datetime-right">
                                <p className="sm-slots-title">
                                    {bookingData.date ? 'Horarios disponibles' : 'Selecciona un día'}
                                </p>
                                <TimeGrid
                                    date={bookingData.date}
                                    selectedTime={bookingData.time}
                                    onSelect={time => setBookingData({ ...bookingData, time })}
                                    busySlots={busySlots}
                                />
                            </div>
                        </div>

                        <div className="sm-actions-dual">
                            <button className="sm-btn-secondary" type="button" onClick={prev}>← Atrás</button>
                            <button
                                className="sm-btn-primary"
                                type="button"
                                onClick={next}
                                disabled={!bookingData.date || !bookingData.time}
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
                            Confirma los datos. El pago se realiza en sucursal al
                            finalizar el servicio.
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
                                <span>Fecha</span>
                                <strong>{formatDateDisplay(bookingData.date)}</strong>
                            </div>
                            <div className="sm-summary-row">
                                <span>Hora preferida</span>
                                <strong>{fmt12(bookingData.time)}</strong>
                            </div>
                            <div className="sm-summary-row sm-summary-row--info">
                                <span>Costo estimado <em>(se ajusta en sucursal)</em></span>
                                <strong className="sm-info-amount">${finalPrice}</strong>
                            </div>
                        </div>

                        <div className="sm-info-box">
                            <FaInfoCircle />
                            <p>
                                El costo final se determina con la evaluación de la mascota
                                al ingreso. El método de pago se acuerda al finalizar el servicio.
                                Llega con máximo 20 minutos de retraso.
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
                            <strong>{formatDateDisplay(savedBooking.date)}</strong> a las{' '}
                            <strong>{fmt12(savedBooking.time)}</strong>.<br />
                            Recibirás confirmación cuando el groomer la acepte.
                        </p>

                        <div className="sm-summary">
                            <div className="sm-summary-row">
                                <span>Servicio</span><strong>{savedBooking.serviceName}</strong>
                            </div>
                            <div className="sm-summary-row">
                                <span>Mascota</span><strong>{savedBooking.petName}</strong>
                            </div>
                            <div className="sm-summary-row sm-summary-row--info">
                                <span>Costo estimado</span>
                                <strong className="sm-info-amount">${finalPrice}</strong>
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