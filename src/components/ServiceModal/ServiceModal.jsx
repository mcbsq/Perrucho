// src/components/ServiceModal/ServiceModal.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    FaCalendarAlt, FaClock, FaCreditCard,
    FaMoneyBillWave, FaCheckCircle, FaTimes, FaPaw,
    FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { appointmentsApi } from '../../api/apiClient';
import '../../pages/Services.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcPrice = (base, weight) => {
    const w = Number(weight), p = Number(base);
    if (!w || !p) return p;
    if (w <= 5)  return p;
    if (w <= 12) return +(p * 1.25).toFixed(2);
    if (w <= 25) return +(p * 1.50).toFixed(2);
    return +(p * 2.0).toFixed(2);
};

const SIZE_LABEL = (w) => {
    const n = Number(w);
    if (n <= 5)  return 'Chico';
    if (n <= 12) return 'Mediano';
    if (n <= 25) return 'Grande';
    return 'Extra grande';
};

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_NAMES   = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

// Slots de 1h entre 9am y 7pm
const ALL_SLOTS = [
    '09:00','10:00','11:00','12:00','13:00',
    '14:00','15:00','16:00','17:00','18:00','19:00',
];

const fmt12 = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
};

const todayISO = () => new Date().toISOString().split('T')[0];

// ─── Mini Calendario ──────────────────────────────────────────────────────────
const MiniCalendar = ({ selectedDate, onSelect }) => {
    const today = new Date();
    const [viewYear,  setViewYear]  = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const firstDow   = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // lunes=0
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

    const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    const isPast  = (d) => new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
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
                <button className="sm-cal-nav" onClick={prevMonth}><FaChevronLeft /></button>
                <span className="sm-cal-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <button className="sm-cal-nav" onClick={nextMonth}><FaChevronRight /></button>
            </div>
            <div className="sm-cal-grid">
                {DAY_NAMES.map(d => <div key={d} className="sm-cal-dow">{d}</div>)}
                {cells.map((d, i) => (
                    <button
                        key={i}
                        className={[
                            'sm-cal-cell',
                            !d         ? 'empty'    : '',
                            d && isPast(d)     ? 'past'     : '',
                            d && isToday(d)    ? 'today'    : '',
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
                            busy     ? 'busy'     : 'free',
                            isActive ? 'active'   : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => !busy && onSelect(slot)}
                        disabled={busy}
                        title={busy ? 'Horario no disponible' : fmt12(slot)}
                    >
                        {busy ? (
                            <>
                                <span className="slot-time">{fmt12(slot)}</span>
                                <span className="slot-label">No disponible</span>
                            </>
                        ) : (
                            <>
                                <span className="slot-time">{fmt12(slot)}</span>
                                <span className="slot-label">{isActive ? '✓ Seleccionado' : 'Disponible'}</span>
                            </>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const ServiceModal = ({ service, onClose }) => {
    const { user }               = useAuth();
    const { pets, clients, addSale } = useData();

    const [step,        setStep]        = useState(1);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [allAppts,    setAllAppts]    = useState([]);
    const [bookingData, setBookingData] = useState({
        petId: '', date: '', time: '', paymentMethod: '',
    });

    // Cargar todas las citas para saber qué slots están ocupados
    useEffect(() => {
        appointmentsApi.getAll()
            .then(setAllAppts)
            .catch(() => {});
    }, []);

    // Slots ocupados para la fecha seleccionada
    const busySlots = useMemo(() => {
        if (!bookingData.date) return [];
        return allAppts
            .filter(a => a.date === bookingData.date && a.status !== 'Cancelada')
            .map(a => a.time)
            .filter(Boolean);
    }, [allAppts, bookingData.date]);

    // Resolver cliente
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
    const finalPrice  = selectedPet ? calcPrice(service.price, selectedPet.weight) : Number(service.price);

    const next = () => { setError(''); setStep(s => s + 1); };
    const prev = () => { setError(''); setStep(s => s - 1); };

    const handleConfirm = async () => {
        if (!bookingData.paymentMethod) { setError('Selecciona un método de pago.'); return; }
        setLoading(true);
        setError('');
        try {
            await appointmentsApi.create({
                petId:         bookingData.petId ? Number(bookingData.petId) : null,
                petName:       selectedPet?.petName || 'Sin mascota',
                serviceId:     service.id,
                serviceName:   service.title,
                clientId:      clientRecord?.id || null,
                date:          bookingData.date,
                time:          bookingData.time,
                status:        'Pendiente',
                finalPrice,
                paymentMethod: bookingData.paymentMethod,
                assignedTo:    '',
                createdAt:     todayISO(),
            });
            await addSale(
                `Reserva: ${service.title} (${selectedPet?.petName || 'sin mascota'})`,
                finalPrice,
                clientRecord?.id || null,
                'service'
            );
            next();
        } catch (e) {
            console.error(e);
            setError('Error al guardar la reserva. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const progressPct = { 1: '25%', 2: '50%', 3: '75%', 4: '100%' };

    const formatDateDisplay = (iso) => {
        if (!iso) return '';
        return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
    };

    return (
        <div className="sm-overlay" onClick={onClose}>
            <div className="sm-capsule" onClick={e => e.stopPropagation()}>

                <button className="sm-close" onClick={onClose}><FaTimes /></button>

                {/* Progress */}
                <div className="sm-progress-track">
                    <div className="sm-progress-fill" style={{ width: progressPct[step] }} />
                </div>
                <div className="sm-steps-dots">
                    {[1,2,3,4].map(n => (
                        <div key={n} className={`sm-dot ${step >= n ? 'done' : ''} ${step === n ? 'current' : ''}`} />
                    ))}
                </div>

                {/* ── PASO 1: Servicio + mascota ── */}
                {step === 1 && (
                    <div className="sm-step fade-in">
                        <div className="sm-service-icon">{service.icon || '🐾'}</div>
                        <h2 className="sm-title">{service.title}</h2>
                        <p className="sm-desc">{service.description}</p>

                        <div className="sm-chips-row">
                            <span className="sm-chip"><FaClock /> {service.duration}</span>
                            <span className="sm-chip accent"><FaMoneyBillWave /> Desde ${service.price}</span>
                        </div>

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
                                            {p.petName} — {SIZE_LABEL(p.weight)} ({p.weight} kg)
                                        </option>
                                    ))}
                                </select>
                                {selectedPet && (
                                    <div className="sm-price-preview">
                                        <span>Precio para {selectedPet.petName}</span>
                                        <strong>${finalPrice}</strong>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="sm-no-pets">
                                <FaPaw />
                                <p>No tienes mascotas registradas aún.<br />Puedes continuar sin seleccionar una.</p>
                            </div>
                        )}

                        <button className="sm-btn-primary" onClick={next}>
                            Elegir fecha y hora →
                        </button>
                    </div>
                )}

                {/* ── PASO 2: Calendario + horarios ── */}
                {step === 2 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">Elige tu fecha y hora</h2>
                        <p className="sm-desc">Selecciona el día y el horario que mejor te convenga.</p>

                        <div className="sm-datetime-layout">
                            {/* Lado izquierdo: calendario */}
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

                            {/* Lado derecho: slots de hora */}
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
                            <button className="sm-btn-secondary" onClick={prev}>← Atrás</button>
                            <button
                                className="sm-btn-primary"
                                onClick={next}
                                disabled={!bookingData.date || !bookingData.time}
                            >
                                Confirmar horario →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 3: Pago + resumen ── */}
                {step === 3 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">Confirmar reserva</h2>

                        <div className="sm-summary">
                            <div className="sm-summary-row">
                                <span>Servicio</span><strong>{service.title}</strong>
                            </div>
                            {selectedPet && (
                                <div className="sm-summary-row">
                                    <span>Mascota</span>
                                    <strong>{selectedPet.petName} · {SIZE_LABEL(selectedPet.weight)}</strong>
                                </div>
                            )}
                            <div className="sm-summary-row">
                                <span>Fecha</span>
                                <strong>{formatDateDisplay(bookingData.date)}</strong>
                            </div>
                            <div className="sm-summary-row">
                                <span>Hora</span>
                                <strong>{fmt12(bookingData.time)}</strong>
                            </div>
                            <div className="sm-summary-row total">
                                <span>Total</span><strong>${finalPrice}</strong>
                            </div>
                        </div>

                        <div className="sm-field">
                            <label><FaCreditCard /> Método de pago</label>
                            <div className="sm-payment-grid">
                                {[
                                    { id: 'efectivo', icon: <FaMoneyBillWave />, label: 'Efectivo' },
                                    { id: 'tarjeta',  icon: <FaCreditCard />,   label: 'Tarjeta'  },
                                ].map(pm => (
                                    <button
                                        key={pm.id}
                                        type="button"
                                        className={`sm-payment-card ${bookingData.paymentMethod === pm.id ? 'active' : ''}`}
                                        onClick={() => setBookingData({ ...bookingData, paymentMethod: pm.id })}
                                    >
                                        {pm.icon}
                                        <span>{pm.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <p className="sm-error">{error}</p>}

                        <div className="sm-actions-dual">
                            <button className="sm-btn-secondary" onClick={prev}>← Atrás</button>
                            <button
                                className="sm-btn-confirm"
                                onClick={handleConfirm}
                                disabled={!bookingData.paymentMethod || loading}
                            >
                                {loading ? 'Guardando...' : '¡Reservar ahora!'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 4: Éxito ── */}
                {step === 4 && (
                    <div className="sm-step sm-success fade-in">
                        <div className="sm-success-icon">
                            <FaCheckCircle />
                        </div>
                        <h2 className="sm-title">¡Reserva confirmada!</h2>
                        <p className="sm-desc">
                            Te esperamos el <strong>{formatDateDisplay(bookingData.date)}</strong> a las{' '}
                            <strong>{fmt12(bookingData.time)}</strong>.
                        </p>

                        <div className="sm-summary">
                            <div className="sm-summary-row">
                                <span>Servicio</span><strong>{service.title}</strong>
                            </div>
                            {selectedPet && (
                                <div className="sm-summary-row">
                                    <span>Mascota</span><strong>{selectedPet.petName}</strong>
                                </div>
                            )}
                            <div className="sm-summary-row">
                                <span>Pago</span>
                                <strong style={{ textTransform: 'capitalize' }}>{bookingData.paymentMethod}</strong>
                            </div>
                            <div className="sm-summary-row total">
                                <span>Total</span><strong>${finalPrice}</strong>
                            </div>
                        </div>

                        <button className="sm-btn-primary" onClick={onClose}>
                            ¡Perfecto, cerrar!
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ServiceModal;