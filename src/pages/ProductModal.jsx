// src/components/ProductModal/ProductModal.jsx
import React, { useState } from 'react';
import { FaCreditCard, FaMoneyBillWave, FaCheckCircle, FaTimes, FaShippingFast } from 'react-icons/fa';
import './Services.css'; // Reutilizamos los estilos base por eficiencia

const ProductModal = ({ product, onClose }) => {
    if (!product) return null;

    const [step, setStep] = useState(1);
    const [purchaseData, setPurchaseData] = useState({
        paymentMethod: '',
    });

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const handleConfirm = () => {
        const existingPurchases = JSON.parse(localStorage.getItem('compras')) || [];
        
        const newPurchase = {
            id: `ORD-${Date.now()}`,
            productId: product.id,
            productName: product.name,
            price: product.price,
            paymentMethod: purchaseData.paymentMethod,
            status: 'En preparación',
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('compras', JSON.stringify([...existingPurchases, newPurchase]));
        nextStep();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-capsule" onClick={(e) => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}><FaTimes /></button>
                
                <div className="modal-progress-container">
                    <div className={`modal-progress-fill step-${step}`}></div>
                </div>

                {step === 1 && (
                    <div className="modal-step-content fade-in">
                        <h2>Confirmar Producto</h2>
                        <div className="service-modal-icon">{product.icon || '🎁'}</div>
                        <h3>{product.name}</h3>
                        <p className="modal-service-description">{product.description}</p>
                        <div className="info-tag price-tag">💰 Total: ${product.price}</div>
                        <button className="btn-modal-primary" onClick={nextStep}>Continuar al pago</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="modal-step-content fade-in">
                        <h2>Método de Pago</h2>
                        <div className="payment-selection-grid">
                            <button 
                                className={`payment-card ${purchaseData.paymentMethod === 'efectivo' ? 'active' : ''}`}
                                onClick={() => setPurchaseData({...purchaseData, paymentMethod: 'efectivo'})}
                            >
                                <FaMoneyBillWave /> <span>Efectivo</span>
                            </button>
                            <button 
                                className={`payment-card ${purchaseData.paymentMethod === 'tarjeta' ? 'active' : ''}`}
                                onClick={() => setPurchaseData({...purchaseData, paymentMethod: 'tarjeta'})}
                            >
                                <FaCreditCard /> <span>Tarjeta</span>
                            </button>
                        </div>
                        <div className="modal-actions-dual">
                            <button className="btn-modal-secondary" onClick={prevStep}>Atrás</button>
                            <button 
                                className="btn-modal-confirm" 
                                onClick={handleConfirm} 
                                disabled={!purchaseData.paymentMethod}
                            >
                                Finalizar Compra
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="modal-step-content success-animation">
                        <FaCheckCircle className="icon-success-final" />
                        <h2>¡Pedido Realizado!</h2>
                        <p>Tu orden <strong>{product.name}</strong> llegará pronto.</p>
                        <button className="btn-modal-primary" onClick={onClose}>Volver a la tienda</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductModal;