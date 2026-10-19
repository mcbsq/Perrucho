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
// - (Revertido, ver abajo) Antes el cliente solo elegía el DÍA y el groomer
//   fijaba la hora.
// - QA (oct 2026): "no me dio un horario". El cliente ahora elige día Y
//   hora en un calendario tipo agenda (BookingCalendar, misma estructura que
//   la del empleado/admin). La cita sigue "Pendiente" hasta que el negocio
//   la acepte — el horario es una solicitud, no una reserva en firme.
// - Se omite el precio/método de pago como dato definitivo en la confirmación;
//   ahora se muestra únicamente como referencia informativa, sin presentarlo
//   como un paso de "pago" — se reduce a una sola línea aclaratoria.
//
// CAMBIOS v3 (catálogo real):
// - Selector de mascota muestra el rango de peso correcto (6 rangos)
// - Precio referencial con calcServicePrice()

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimes, FaPaw, FaWhatsapp, FaInfoCircle, FaCalendarCheck } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { appointmentsApi, staffApi } from '../../api/apiClient';
import { clientToShopOnBooking, openWhatsApp } from '../../utils/whatsappNotify';
import { calcServicePrice, weightRangeLabel } from '../../utils/pricingRules';
import BookingCalendar, { formatTime12 } from '../BookingCalendar/BookingCalendar';
import '../../pages/Services.css';

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const ServiceModal = ({ service, onClose }) => {
    const { user }      = useAuth();
    const { settings } = useData();
    const navigate      = useNavigate();

    const [step,        setStep]        = useState(1);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [myPets,      setMyPets]      = useState([]);
    const [petsLoading, setPetsLoading] = useState(true);
    const [bookingData, setBookingData] = useState({ petId: '', date: '', time: '', employeeId: '' });
    const [savedBooking, setSavedBooking] = useState(null);
    const [staff, setStaff] = useState([]);

    React.useEffect(() => {
        if (!settings?.enableStaffSelection) return;
        staffApi.getPublic().then(setStaff).catch(() => setStaff([]));
    }, [settings?.enableStaffSelection]);

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
            // El cliente solicita día + hora; queda Pendiente hasta que el
            // negocio la acepte (el backend revalida el horario).
            // FIX: petName/serviceName/paymentMethod/assignedTo NO son columnas
            // del modelo Appointment en Prisma (ver prisma/schema.prisma) — al
            // enviarlas, prisma.appointment.create() lanzaba
            // PrismaClientValidationError y el backend respondía "Error del
            // servidor" (bug reportado: no se podía agendar con registro
            // completo, aunque cita rápida sí funcionaba porque ese flujo en
            // Home.jsx nunca mandó esos campos). petId/serviceId ya alcanzan
            // para que el include del backend resuelva nombre de mascota y
            // servicio.
            await appointmentsApi.create({
                petId:       bookingData.petId ? Number(bookingData.petId) : null,
                serviceId:   service.id,
                clientId:    user?.id || null,
                employeeId:  bookingData.employeeId ? Number(bookingData.employeeId) : null,
                date:        bookingData.date,
                time:        bookingData.time,
                status:      'Pendiente',
                finalPrice,
            });
            setSavedBooking({
                clientName:  user?.name || 'Cliente',
                petName,
                serviceName: service.title,
                date:        bookingData.date,
                time:        bookingData.time,
                shopName:    settings?.businessName,
                shopWhatsApp: settings?.whatsappNumber,
            });
            next();
        } catch (e) {
            console.error(e);
            // 400/409: regla de negocio (duplicada, día sin horario, etc.) —
            // el mensaje del servidor ya es legible para el cliente.
            setError([400, 409].includes(e.status) ? e.message : 'Error al guardar la reserva. Intenta de nuevo.');
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

    const formatDateShort = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

    const formatDateDisplay = (iso) => {
        if (!iso) return '';
        return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
    };

    return (
        <div className="sm-overlay" onClick={onClose}>
            <div className={`sm-capsule ${step === 2 ? 'sm-capsule--wide' : ''}`} onClick={e => e.stopPropagation()}>

                <button className="sm-close" type="button" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>

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
                                <p>No tienes mascotas registradas aún.<br />Regístrala para poder reservar.</p>
                                <button className="sm-btn-secondary" type="button"
                                    onClick={() => { onClose(); navigate('/perfil?accion=nueva-mascota'); }}>
                                    <FaPaw /> Registrar mi mascota
                                </button>
                            </div>
                        )}

                        <button
                            className="sm-btn-primary"
                            type="button"
                            onClick={next}
                            disabled={myPets.length > 0 && !bookingData.petId}
                        >
                            Elegir día y hora
                        </button>
                    </div>
                )}

                {/* ── PASO 2: Día y hora en calendario tipo agenda ── */}
                {step === 2 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">Elige día y hora</h2>
                        <p className="sm-desc">
                            Toca un horario disponible. Tu cita quedará pendiente hasta
                            que {settings?.businessName || 'el negocio'} la confirme.
                        </p>

                        {staff.length > 0 && (
                            <div className="sm-field">
                                <label htmlFor="sm-staff">¿Quién te gustaría que te atienda?</label>
                                <select id="sm-staff" value={bookingData.employeeId}
                                    onChange={e => setBookingData({ ...bookingData, employeeId: e.target.value, time: '' })}>
                                    <option value="">Sin preferencia</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}

                        <BookingCalendar
                            serviceId={service.id}
                            employeeId={bookingData.employeeId || null}
                            value={{ date: bookingData.date, time: bookingData.time }}
                            onChange={({ date, time }) => setBookingData({ ...bookingData, date, time })}
                        />

                        <div className="sm-actions-dual">
                            <button className="sm-btn-secondary" type="button" onClick={prev}>Atrás</button>
                            <button
                                className="sm-btn-primary"
                                type="button"
                                onClick={next}
                                disabled={!bookingData.date || !bookingData.time}
                            >
                                {bookingData.time
                                    ? `Continuar · ${formatDateShort(bookingData.date)}, ${formatTime12(bookingData.time)}`
                                    : 'Elige un horario'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 3: Confirmación ── */}
                {step === 3 && (
                    <div className="sm-step fade-in">
                        <h2 className="sm-title">Revisa tu reserva</h2>

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
                                <span>Día</span>
                                <strong>{formatDateDisplay(bookingData.date)}</strong>
                            </div>
                            <div className="sm-summary-row">
                                <span>Hora solicitada</span>
                                <strong>{formatTime12(bookingData.time)}</strong>
                            </div>
                        </div>

                        <div className="sm-info-box">
                            <FaInfoCircle />
                            <p>
                                El negocio confirmará tu horario y te avisará por WhatsApp.
                                El costo final se define en sucursal.
                            </p>
                        </div>

                        {error && <p className="sm-error" role="alert">{error}</p>}

                        <div className="sm-actions-dual">
                            <button className="sm-btn-secondary" type="button" onClick={prev}>Cambiar horario</button>
                            <button
                                className="sm-btn-confirm"
                                type="button"
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? 'Reservando…' : 'Reservar'}
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
                        <h2 className="sm-title">¡Solicitud enviada!</h2>
                        <p className="sm-desc">
                            Pediste el <strong>{formatDateDisplay(savedBooking.date)}</strong> a las{' '}
                            <strong>{formatTime12(savedBooking.time)}</strong>. Tu cita está
                            <strong> pendiente</strong> hasta que el negocio la confirme.
                        </p>

                        <div className="sm-summary">
                            <div className="sm-summary-row">
                                <span>Servicio</span><strong>{savedBooking.serviceName}</strong>
                            </div>
                            <div className="sm-summary-row">
                                <span>Mascota</span><strong>{savedBooking.petName}</strong>
                            </div>
                        </div>

                        <div className="sm-success-actions">
                            <button className="sm-btn-primary" type="button" onClick={() => { onClose(); navigate('/perfil?tab=citas'); }}>
                                <FaCalendarCheck /> Ver mis citas
                            </button>
                            {settings?.whatsappNumber && (
                                <button className="sm-btn-whatsapp" type="button" onClick={handleNotifyShop}>
                                    <FaWhatsapp /> Avisar por WhatsApp
                                </button>
                            )}
                            <button className="sm-btn-ghost" type="button" onClick={onClose}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ServiceModal;