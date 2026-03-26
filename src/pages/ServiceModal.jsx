// src/components/ServiceModal/ServiceModal.jsx
import React, { useState, useMemo } from 'react';
import {
    FaCalendarAlt, FaClock, FaCreditCard,
    FaMoneyBillWave, FaCheckCircle, FaTimes, FaPaw
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { appointmentsApi } from '../../api/apiClient';
import './Services.css';

// ─── Precio dinámico por peso ─────────────────────────────────────────────────
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

// ─── Horarios disponibles ─────────────────────────────────────────────────────
const TIME_SLOTS = [
    { label: '10:00 AM', value: '10:00' },
    { label: '11:00 AM', value: '11:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '02:00 PM', value: '14:00' },
    { label: '03:00 PM', value: '15:00' },
    { label: '04:00 PM', value: '16:00' },
];

// ─── Componente principal ─────────────────────────────────────────────────────
const ServiceModal = ({ service, onClose }) => {
    const { user }        = useAuth();
    const { pets, clients, addSale } = useData();

    const [step,        setStep]        = useState(1);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [bookingData, setBookingData] = useState({
        petId:         '',
        date:          '',
        time:          '',
        paymentMethod: '',
    });

    if (!service) return null;

    // Mascotas del cliente logueado
    // Buscamos el cliente cuyo email coincide con el usuario
    const clientRecord = useMemo(() =>
        clients.find(c => c.email === user?.email),
        [clients, user]
    );

    const myPets = useMemo(() =>
        clientRecord
            ? pets.filter(p => String(p.ownerId) === String(clientRecord.id))
            : [],
        [pets, clientRecord]
    );

    const selectedPet = myPets.find(p => String(p.id) === String(bookingData.petId));

    const finalPrice = selectedPet
        ? calcPrice(service.price, selectedPet.weight)
        : Number(service.price);

    // ── Navegación de pasos ───────────────────────────────────────────────────
    const next = () => { setError(''); setStep(s => s + 1); };
    const prev = () => { setError(''); setStep(s => s - 1); };

    // ── Confirmar reserva ─────────────────────────────────────────────────────
    const handleConfirm = async () => {
        if (!bookingData.paymentMethod) {
            setError('Selecciona un método de pago.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            // 1. Crear cita en JSON Server
            await appointmentsApi.create({
                petId:       bookingData.petId || null,
                petName:     selectedPet?.petName || 'Sin mascota',
                serviceId:   service.id,
                serviceName: service.title,
                clientId:    clientRecord?.id || null,
                date:        bookingData.date,
                time:        bookingData.time,
                status:      'Pendiente',
                finalPrice,
                paymentMethod: bookingData.paymentMethod,
                createdAt:   new Date().toISOString().split('T')[0],
            });

            // 2. Registrar en ventas
            await addSale(
                `Reserva: ${service.title} (${selectedPet?.petName || 'sin mascota'})`,
                finalPrice,
                clientRecord?.id || null,
                'service'
            );

            next(); // → paso 4: éxito
        } catch (e) {
            console.error(e);
            setError('Error al guardar la reserva. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // ── Progreso ──────────────────────────────────────────────────────────────
    const progressMap = { 1: '25%', 2: '50%', 3: '75%', 4: '100%' };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-capsule" onClick={e => e.stopPropagation()}>

                <button className="close-btn" onClick={onClose}><FaTimes /></button>

                {/* Barra de progreso */}
                <div className="modal-progress-container">
                    <div
                        className="modal-progress-fill"
                        style={{ width: progressMap[step] }}
                    />
                </div>

                {/* ── PASO 1: Resumen del servicio ── */}
                {step === 1 && (
                    <div className="modal-step-content fade-in">
                        <span className="service-modal-icon">{service.icon || '🐾'}</span>
                        <h2>¿Deseas reservar {service.title}?</h2>
                        <p className="modal-service-description">{service.description}</p>

                        <div className="modal-quick-info">
                            <div className="info-tag"><FaClock /> {service.duration}</div>
                            <div className="info-tag price-tag"><FaMoneyBillWave /> Desde ${service.price}</div>
                        </div>

                        {/* Selector de mascota */}
                        {myPets.length > 0 ? (
                            <div className="modal-form-group">
                                <label><FaPaw /> ¿Para cuál de tus mascotas?</label>
                                <select
                                    value={bookingData.petId}
                                    onChange={e => setBookingData({ ...bookingData, petId: e.target.value })}
                                >
                                    <option value="">Selecciona una mascota</option>
                                    {myPets.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.petName} — {SIZE_LABEL(p.weight)} ({p.weight} kg)
                                        </option>
                                    ))}
                                </select>

                                {/* Precio dinámico según mascota */}
                                {selectedPet && (
                                    <div className="dynamic-price-preview">
                                        <span>Precio para {selectedPet.petName}</span>
                                        <strong>${finalPrice}</strong>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="no-pets-notice">
                                <FaPaw />
                                <p>
                                    No tienes mascotas registradas aún.<br />
                                    Puedes continuar sin seleccionar una.
                                </p>
                            </div>
                        )}

                        <button className="btn-modal-primary" onClick={next}>
                            Continuar y elegir fecha
                        </button>
                    </div>
                )}

                {/* ── PASO 2: Fecha y hora ── */}
                {step === 2 && (
                    <div className="modal-step-content fade-in">
                        <h2>Elige tu fecha y hora</h2>

                        <div className="modal-form-group">
                            <label><FaCalendarAlt /> Día</label>
                            <input
                                type="date"
                                value={bookingData.date}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                            />
                        </div>

                        <div className="modal-form-group">
                            <label><FaClock /> Horario</label>
                            <div className="time-slots-grid">
                                {TIME_SLOTS.map(slot => (
                                    <button
                                        key={slot.value}
                                        className={`time-slot-btn ${bookingData.time === slot.value ? 'active' : ''}`}
                                        onClick={() => setBookingData({ ...bookingData, time: slot.value })}
                                        type="button"
                                    >
                                        {slot.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions-dual">
                            <button className="btn-modal-secondary" onClick={prev}>Atrás</button>
                            <button
                                className="btn-modal-primary"
                                onClick={next}
                                disabled={!bookingData.date || !bookingData.time}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 3: Pago + resumen ── */}
                {step === 3 && (
                    <div className="modal-step-content fade-in">
                        <h2>Confirmar reserva</h2>

                        {/* Resumen */}
                        <div className="booking-summary">
                            <div className="summary-row">
                                <span>Servicio</span>
                                <strong>{service.title}</strong>
                            </div>
                            {selectedPet && (
                                <div className="summary-row">
                                    <span>Mascota</span>
                                    <strong>{selectedPet.petName} · {SIZE_LABEL(selectedPet.weight)}</strong>
                                </div>
                            )}
                            <div className="summary-row">
                                <span>Fecha</span>
                                <strong>{bookingData.date}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Hora</span>
                                <strong>{bookingData.time}</strong>
                            </div>
                            <div className="summary-row summary-row--total">
                                <span>Total</span>
                                <strong>${finalPrice}</strong>
                            </div>
                        </div>

                        {/* Método de pago */}
                        <div className="modal-form-group">
                            <label><FaCreditCard /> Método de pago</label>
                            <div className="payment-selection-grid">
                                <button
                                    type="button"
                                    className={`payment-card ${bookingData.paymentMethod === 'efectivo' ? 'active' : ''}`}
                                    onClick={() => setBookingData({ ...bookingData, paymentMethod: 'efectivo' })}
                                >
                                    <FaMoneyBillWave /> <span>Efectivo</span>
                                </button>
                                <button
                                    type="button"
                                    className={`payment-card ${bookingData.paymentMethod === 'tarjeta' ? 'active' : ''}`}
                                    onClick={() => setBookingData({ ...bookingData, paymentMethod: 'tarjeta' })}
                                >
                                    <FaCreditCard /> <span>Tarjeta</span>
                                </button>
                            </div>
                        </div>

                        {error && <p className="modal-error">{error}</p>}

                        <div className="modal-actions-dual">
                            <button className="btn-modal-secondary" onClick={prev}>Atrás</button>
                            <button
                                className="btn-modal-confirm"
                                onClick={handleConfirm}
                                disabled={!bookingData.paymentMethod || loading}
                            >
                                {loading ? 'Guardando...' : 'Finalizar reserva'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 4: Éxito ── */}
                {step === 4 && (
                    <div className="modal-step-content success-animation fade-in">
                        <FaCheckCircle className="icon-success-final" />
                        <h2>¡Reserva confirmada!</h2>
                        <p>
                            Te esperamos el <strong>{bookingData.date}</strong> a las{' '}
                            <strong>{bookingData.time}</strong>.
                        </p>

                        <div className="resumen-final-box">
                            <div className="summary-row">
                                <span>Servicio</span><strong>{service.title}</strong>
                            </div>
                            {selectedPet && (
                                <div className="summary-row">
                                    <span>Mascota</span><strong>{selectedPet.petName}</strong>
                                </div>
                            )}
                            <div className="summary-row">
                                <span>Pago</span>
                                <strong style={{ textTransform: 'capitalize' }}>{bookingData.paymentMethod}</strong>
                            </div>
                            <div className="summary-row summary-row--total">
                                <span>Total</span><strong>${finalPrice}</strong>
                            </div>
                        </div>

                        <button className="btn-modal-primary" onClick={onClose}>Cerrar</button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ServiceModal;