// src/components/ServiceModal/ServiceModal.jsx
import React, { useState } from 'react';
import './ServiceModal.css'; 

// --- SIMULACIÓN DE HORARIOS ---
const generateAvailableSlots = () => {
    const slots = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    for (let h = 9; h <= 17; h++) {
        if (h !== 11) {
            slots.push(`${dateStr} ${h}:00`);
        }
    }
    return slots;
};

const availableSlots = generateAvailableSlots();
// ------------------------------

const ServiceModal = ({ service, onClose }) => {
    const [step, setStep] = useState(1);
    const [reservationData, setReservationData] = useState({
        date: '',
        time: '',
        paymentMethod: '',
        cardNumber: '', 
        expiryDate: '', // <-- ¡NUEVO!
        cvv: ''         // <-- ¡NUEVO!
    });
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [error, setError] = useState('');

    // Función para manejar la selección de horario
    const handleSlotSelection = (slot) => {
        const [date, time] = slot.split(' ');
        setReservationData(prev => ({ ...prev, date, time }));
    };

    // Función para manejar el avance de paso
    const handleNext = () => {
        setError('');
        if (step === 2 && (!reservationData.date || !reservationData.time)) {
            setError('Por favor, selecciona una fecha y hora disponibles.');
            return;
        }
        setStep(step + 1);
    };

    // Función para manejar la reserva final (Simulación de pago)
    const handleConfirmReservation = () => {
        setError('');
        if (!reservationData.paymentMethod) {
            setError('Por favor, selecciona un método de pago.');
            return;
        }

        // --- SIMULACIÓN DE PAGO MEJORADA (Validación de 3 campos) ---
        let isPaymentValid = false;

        if (reservationData.paymentMethod === 'Efectivo') {
            isPaymentValid = true;
        } else if (reservationData.paymentMethod === 'Tarjeta') {
            isPaymentValid = (
                reservationData.cardNumber.length >= 15 && 
                reservationData.expiryDate.length === 5 && // MM/YY
                reservationData.cvv.length >= 3
            );
        }
        // ------------------------------------

        if (isPaymentValid) {
            console.log("Reserva Confirmada:", reservationData);
            setPaymentSuccess(true);
            setStep(4); // Paso de éxito
        } else {
            setError('Por favor, revisa que todos los campos de pago con tarjeta estén completos y sean válidos.');
        }
    };

    // ----------------------------------------------------
    // VISTAS POR PASO
    // ----------------------------------------------------

    const renderStep1Info = () => (
        <div className="modal-step-content">
            <h3>Paso 1: Información del Servicio</h3>
            <div className="service-summary">
                <span className="summary-icon">{service.icon}</span>
                <h4>{service.title}</h4>
                <p>{service.description}</p>
                <p><strong>Duración:</strong> {service.duration}</p>
                <p><strong>Costo Total:</strong> ${service.price}</p>
            </div>
            <button className="modal-button primary" onClick={handleNext}>
                Continuar a Horario
            </button>
        </div>
    );

    const renderStep2Schedule = () => (
        <div className="modal-step-content">
            <h3>Paso 2: Seleccionar Horario</h3>
            {error && <p className="modal-error">{error}</p>}
            <p>Horarios disponibles para el **día de mañana**:</p>
            
            <div className="schedule-slots-grid">
                {availableSlots.map((slot) => {
                    const isSelected = reservationData.date && reservationData.time && 
                                       `${reservationData.date} ${reservationData.time}` === slot;
                    
                    return (
                        <button
                            key={slot}
                            className={`slot-button ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleSlotSelection(slot)}
                        >
                            {slot.split(' ')[1]}
                        </button>
                    );
                })}
            </div>
            
            {reservationData.date && reservationData.time && (
                <p className="selected-slot-text">
                    Has seleccionado: **{reservationData.time}** del **{reservationData.date}**
                </p>
            )}

            <div className="modal-actions">
                <button className="modal-button secondary" onClick={() => setStep(1)}>
                    Anterior
                </button>
                <button className="modal-button primary" onClick={handleNext} disabled={!reservationData.date}>
                    Continuar a Pago
                </button>
            </div>
        </div>
    );

    const renderStep3Payment = () => (
        <div className="modal-step-content">
            <h3>Paso 3: Método de Pago</h3>
            {error && <p className="modal-error">{error}</p>}
            
            <div className="payment-options">
                <label className={`payment-option-card ${reservationData.paymentMethod === 'Tarjeta' ? 'selected' : ''}`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="Tarjeta" 
                        onChange={(e) => setReservationData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        checked={reservationData.paymentMethod === 'Tarjeta'}
                    />
                    Pago con Tarjeta
                </label>
                <label className={`payment-option-card ${reservationData.paymentMethod === 'Efectivo' ? 'selected' : ''}`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="Efectivo" 
                        onChange={(e) => setReservationData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                        checked={reservationData.paymentMethod === 'Efectivo'}
                    />
                    Pago en Efectivo (al llegar)
                </label>
            </div>
            
            {/* Campo para Tarjeta (solo si se selecciona Tarjeta) */}
            {reservationData.paymentMethod === 'Tarjeta' && (
                <div className="card-fields-group">
                    <input
                        type="text"
                        placeholder="Número de Tarjeta (16 dígitos)"
                        value={reservationData.cardNumber}
                        onChange={(e) => setReservationData(prev => ({ ...prev, cardNumber: e.target.value.replace(/[^0-9]/g, '').slice(0, 16) }))}
                        className="card-input"
                        maxLength="16"
                    />
                    <div className="card-details-row">
                        <input
                            type="text"
                            placeholder="MM/AA"
                            value={reservationData.expiryDate}
                            onChange={(e) => setReservationData(prev => ({ ...prev, expiryDate: e.target.value.replace(/[^0-9/]/g, '').slice(0, 5) }))}
                            className="card-input detail-field"
                            maxLength="5"
                        />
                        <input
                            type="text"
                            placeholder="CVV"
                            value={reservationData.cvv}
                            onChange={(e) => setReservationData(prev => ({ ...prev, cvv: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                            className="card-input detail-field"
                            maxLength="4"
                        />
                    </div>
                </div>
            )}
            
            <div className="modal-actions">
                <button className="modal-button secondary" onClick={() => setStep(2)}>
                    Anterior
                </button>
                <button className="modal-button primary" onClick={handleConfirmReservation}>
                    Confirmar Reserva (${service.price})
                </button>
            </div>
        </div>
    );

    const renderStep4Success = () => (
        <div className="modal-step-content success-step">
            <span className="success-icon">✅</span>
            <h3>¡Reserva Exitosa!</h3>
            <p>Tu servicio de **{service.title}** ha sido reservado.</p>
            <p>Te esperamos el **{reservationData.date}** a las **{reservationData.time}**.</p>
            <button className="modal-button primary" onClick={onClose}>
                Terminar
            </button>
        </div>
    );

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                
                {/* Indicador de Pasos */}
                <div className="step-indicator">
                    <span className={`step ${step >= 1 ? 'active' : ''}`}>1. Info</span>
                    <span className={`step ${step >= 2 ? 'active' : ''}`}>2. Horario</span>
                    <span className={`step ${step >= 3 ? 'active' : ''}`}>3. Pago</span>
                    <span className={`step ${step === 4 ? 'active' : ''}`}>4. Éxito</span>
                </div>
                
                {/* Contenido del Paso Actual */}
                {step === 1 && renderStep1Info()}
                {step === 2 && renderStep2Schedule()}
                {step === 3 && renderStep3Payment()}
                {step === 4 && renderStep4Success()}

            </div>
        </div>
    );
};

export default ServiceModal;