// src/components/ServiceModal/ServiceModal.jsx
import React, { useState } from 'react';
import { 
    FaCalendarAlt, 
    FaClock, 
    FaCreditCard, 
    FaMoneyBillWave, 
    FaCheckCircle, 
    FaTimes 
} from 'react-icons/fa';
import './Services.css';

const ServiceModal = ({ service, onClose }) => {
    // Protección: Si no hay servicio, no renderizamos nada
    if (!service) return null;

    const [step, setStep] = useState(1);
    const [bookingData, setBookingData] = useState({
        date: '',
        time: '',
        paymentMethod: '',
    });

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleConfirm = () => {
        const existingReservations = JSON.parse(localStorage.getItem('reservas')) || [];
        
        const newReservation = {
            id: `RES-${Date.now()}`,
            serviceId: service.id,
            serviceTitle: service.title,
            serviceIcon: service.icon,
            price: service.price,
            date: bookingData.date,
            time: bookingData.time,
            paymentMethod: bookingData.paymentMethod,
            status: 'Confirmada',
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('reservas', JSON.stringify([...existingReservations, newReservation]));
        nextStep();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-capsule" onClick={(e) => e.stopPropagation()}>
                
                <button className="close-btn" onClick={onClose}>
                    <FaTimes />
                </button>
                
                <div className="modal-progress-container">
                    <div className={`modal-progress-fill step-${step}`}></div>
                </div>

                {/* PASO 1: RESUMEN DE COMPRA */}
                {step === 1 && (
                    <div className="modal-step-content fade-in">
                        <span className="service-modal-icon">{service.icon || '🐾'}</span>
                        <h2>¿Deseas reservar {service.title}?</h2>
                        <p className="modal-service-description">{service.description}</p>
                        
                        <div className="modal-quick-info">
                            <div className="info-tag"><FaClock /> {service.duration}</div>
                            <div className="info-tag price-tag"><FaMoneyBillWave /> ${service.price}</div>
                        </div>

                        <button className="btn-modal-primary" onClick={nextStep}>
                            Confirmar y elegir fecha
                        </button>
                    </div>
                )}

                {/* PASO 2: AGENDA */}
                {step === 2 && (
                    <div className="modal-step-content fade-in">
                        <h2>Selecciona fecha y hora</h2>
                        <div className="modal-form-group">
                            <label><FaCalendarAlt /> Día</label>
                            <input 
                                type="date" 
                                min={new Date().toISOString().split('T')[0]} 
                                onChange={(e) => setBookingData({...bookingData, date: e.target.value})} 
                            />
                        </div>
                        <div className="modal-form-group">
                            <label><FaClock /> Hora</label>
                            <select onChange={(e) => setBookingData({...bookingData, time: e.target.value})}>
                                <option value="">Selecciona horario</option>
                                <option value="10:00">10:00 AM</option>
                                <option value="12:00">12:00 PM</option>
                                <option value="14:00">02:00 PM</option>
                                <option value="16:00">04:00 PM</option>
                            </select>
                        </div>
                        <div className="modal-actions-dual">
                            <button className="btn-modal-secondary" onClick={prevStep}>Atrás</button>
                            <button className="btn-modal-primary" onClick={nextStep} disabled={!bookingData.date || !bookingData.time}>
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 3: PAGO */}
                {step === 3 && (
                    <div className="modal-step-content fade-in">
                        <h2>Método de Pago</h2>
                        <div className="payment-selection-grid">
                            <button 
                                className={`payment-card ${bookingData.paymentMethod === 'efectivo' ? 'active' : ''}`}
                                onClick={() => setBookingData({...bookingData, paymentMethod: 'efectivo'})}
                            >
                                <FaMoneyBillWave /> <span>Efectivo</span>
                            </button>
                            <button 
                                className={`payment-card ${bookingData.paymentMethod === 'tarjeta' ? 'active' : ''}`}
                                onClick={() => setBookingData({...bookingData, paymentMethod: 'tarjeta'})}
                            >
                                <FaCreditCard /> <span>Tarjeta</span>
                            </button>
                        </div>
                        <div className="modal-actions-dual">
                            <button className="btn-modal-secondary" onClick={prevStep}>Atrás</button>
                            <button className="btn-modal-confirm" onClick={handleConfirm} disabled={!bookingData.paymentMethod}>
                                Finalizar Reserva
                            </button>
                        </div>
                    </div>
                )}

                {/* PASO 4: ÉXITO */}
                {step === 4 && (
                    <div className="modal-step-content success-animation">
                        <FaCheckCircle className="icon-success-final" />
                        <h2>¡Reserva Lista!</h2>
                        <p>Te esperamos el <strong>{bookingData.date}</strong>.</p>
                        <button className="btn-modal-primary" onClick={onClose}>Cerrar</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServiceModal;