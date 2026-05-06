// src/components/ServiceModal/ServiceModal.jsx
//
// CAMBIOS según feedback del cliente:
// 1. Quitar "tiempo de trabajo" del flujo — ya no se muestra duración como chip
//    ni se pide. El cliente solo elige día y el groomer asigna horario después.
// 2. En la confirmación (paso 4), TOTAL y MÉTODO DE PAGO ya no se muestran como
//    importes a cobrar. El total queda solo "informativo" en gris pequeño y el
//    método de pago no aparece (se acordará al final del servicio según peso real).
// 3. Tras confirmar la cita, se ofrece un botón opcional para enviar mensaje
//    de WhatsApp al negocio confirmando que se reservó por la página.
// 4. Bug fix: la sale ahora se crea con type='service' (antes se perdía).
// 5. Fix: el petName guardado en el appt usa el nombre real cuando hay mascota.

import React, { useState, useMemo, useEffect } from 'react';
import {
    FaCalendarAlt, FaClock, FaCheckCircle, FaTimes, FaPaw,
    FaChevronLeft, FaChevronRight, FaWhatsapp, FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { appointmentsApi } from '../../api/apiClient';
import { clientToShopOnBooking, openWhatsApp } from '../../utils/whatsappNotify';
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
    if (!n) return 'Por verificar';
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
    if (!t) return '';
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
    const { user }                    = useAuth();
    const { pets, clients, addSale }  = useData();

    const [step,        setStep]        = useState(1);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [allAppts,    setAllAppts]    = useState([]);
    const [bookingData, setBookingData] = useState({
        petId: '', date: '', time: '',
    });
    // Guarda info para mostrar en pantalla de éxito y armar el WhatsApp
    const [savedBooking, setSavedBooking] = useState(null);

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
    // El precio se calcula con el peso APROXIMADO ingresado por el cliente.
    // Se mostrará como "estimado" porque se verifica con báscula en sucursal.
    const finalPrice  = selectedPet ? calcPrice(service.price, selectedPet.weight) : Number(service.price);

    const next = () => { setError(''); setStep(s => s + 1); };
    const prev = () => { setError(''); setStep(s => s - 1); };

    // ── Guardar reserva ──────────────────────────────────────────────────────
    // Ya no se pregunta método de pago aquí — se acuerda al final del servicio
    // según el peso real verificado.
    const handleConfirm = async () => {
        setLoading(true);
        setError('');
        try {
            const petName = selectedPet?.petName || 'Sin mascota';
            const appt = await appointmentsApi.create({
                petId:         bookingData.petId ? Number(bookingData.petId) : null,
                petName,
                serviceId:     service.id,
                serviceName:   service.title,
                clientId:      clientRecord?.id || null,
                date:          bookingData.date,
                time:          bookingData.time,
                status:        'Pendiente',
                finalPrice,           // precio estimado
                paymentMethod: '',    // se define al finalizar el servicio
                assignedTo:    '',
                createdAt:     todayISO(),
            });
            // Registrar venta tipo "service" (FIX: antes se perdía el type)
            await addSale(
                `Reserva: ${service.title} (${petName})`,
                finalPrice,
                clientRecord?.id || null,
                'service'
            );
            // Guardar para pantalla de éxito y armado de mensaje WhatsApp
            setSavedBooking({
                appt,
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

    // ── Notificar al negocio por WhatsApp ─────────────────────────────────────
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

                {/* Progress — ahora son 3 pasos visibles + 1 de éxito */}
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
                {/* Cambio: ya no se muestra chip de duración */}
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
                                            {p.petName}{p.weight ? ` — ${SIZE_LABEL(p.weight)} (${p.weight} kg aprox.)` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedPet && (
                                    <>
                                        <div className="sm-price-preview">
                                            <span>Precio estimado para {selectedPet.petName}</span>
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

                {/* ── PASO 3: Confirmación (sin pago) ── */}
                {/* Cambio: ya no se pide método de pago. El total aparece como
                    "estimado" en pequeño, no como "Total a pagar". */}
                {step === 3 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">Revisar reserva</h2>
                        <p className="sm-desc">
                            Confirma los datos. El pago se realizará en sucursal al
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
                                        {selectedPet.weight ? ` · ${SIZE_LABEL(selectedPet.weight)}` : ''}
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
                            {/* Total ahora es solo informativo, en clase distinta */}
                            <div className="sm-summary-row sm-summary-row--info">
                                <span>Costo estimado <em>(se ajusta en sucursal)</em></span>
                                <strong className="sm-info-amount">${finalPrice}</strong>
                            </div>
                        </div>

                        <div className="sm-info-box">
                            <FaInfoCircle />
                            <p>
                                El costo final depende del peso real y las condiciones
                                de tu mascota, que se verifican en la sucursal. El método
                                de pago se acuerda al finalizar el servicio.
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

                {/* ── PASO 4: Éxito + opción WhatsApp ── */}
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

                        <button
                            className="sm-btn-whatsapp"
                            type="button"
                            onClick={handleNotifyShop}
                        >
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