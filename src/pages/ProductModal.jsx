// src/pages/ProductModal.jsx
// Si lo mueves a src/components/ServiceModal/, cambia las rutas a ../../contexts/...
import React, { useState, useMemo } from 'react';
import {
    FaCreditCard, FaMoneyBillWave, FaCheckCircle,
    FaTimes, FaPlus, FaMinus
} from 'react-icons/fa';
import { useAuth }  from '../contexts/AuthContext';
import { useData }  from '../contexts/DataContext';
import './Shop.css';

const ProductModal = ({ product, onClose }) => {
    const { user }                                       = useAuth();
    const { clients, addSale, updateProduct, products }  = useData();

    const [step,          setStep]          = useState(1);
    const [qty,           setQty]           = useState(1);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState('');

    // ✅ CORRECCIÓN: El Hook debe definirse ANTES de cualquier return condicional
    const clientRecord = useMemo(() =>
        clients.find(c => c.email === user?.email),
        [clients, user]
    );

    // ✅ El return temprano ahora va después de todos los Hooks definidos
    if (!product) return null;

    const maxQty = Number(product.stock) || 1;
    const total  = product.price * qty;

    const increaseQty = () => setQty(q => Math.min(q + 1, maxQty));
    const decreaseQty = () => setQty(q => Math.max(q - 1, 1));

    const handleConfirm = async () => {
        if (!paymentMethod) { setError('Selecciona un método de pago.'); return; }
        setLoading(true);
        setError('');
        try {
            await addSale(
                `${product.name} (x${qty})`,
                total,
                clientRecord?.id || null,
                'product'
            );
            const current = products.find(p => p.id === product.id);
            if (current) {
                await updateProduct(product.id, {
                    ...current,
                    stock: Number(current.stock) - qty
                });
            }
            setStep(3);
        } catch (e) {
            console.error(e);
            setError('Error al procesar la compra. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const progressMap = { 1: '33%', 2: '66%', 3: '100%' };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-capsule" onClick={e => e.stopPropagation()}>

                <button className="close-btn" onClick={onClose}><FaTimes /></button>

                <div className="modal-progress-container">
                    <div className="modal-progress-fill" style={{ width: progressMap[step] }} />
                </div>

                {/* ── PASO 1: Producto + cantidad ── */}
                {step === 1 && (
                    <div className="modal-step-content fade-in">
                        <div className="service-modal-icon">
                            {product.image
                                ? <img src={product.image} alt={product.name}
                                    style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'32px' }} />
                                : (product.icon || '🎁')}
                        </div>
                        <h2>{product.name}</h2>
                        <p className="modal-service-description">
                            {product.description || `Categoría: ${product.category}`}
                        </p>

                        <div className="qty-selector">
                            <button className="qty-btn" onClick={decreaseQty} disabled={qty <= 1}>
                                <FaMinus />
                            </button>
                            <span className="qty-display">{qty}</span>
                            <button className="qty-btn" onClick={increaseQty} disabled={qty >= maxQty}>
                                <FaPlus />
                            </button>
                        </div>
                        <p className="qty-stock-note">{maxQty} unidades disponibles</p>

                        <div className="product-total-preview">
                            <span>Total</span>
                            <strong>${total}</strong>
                        </div>

                        <button className="btn-modal-primary" onClick={() => setStep(2)}>
                            Continuar al pago
                        </button>
                    </div>
                )}

                {/* ── PASO 2: Pago ── */}
                {step === 2 && (
                    <div className="modal-step-content fade-in">
                        <h2>Método de pago</h2>

                        <div className="booking-summary" style={{ marginBottom: 20 }}>
                            <div className="summary-row">
                                <span>Producto</span><strong>{product.name}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Cantidad</span><strong>{qty} unidad{qty > 1 ? 'es' : ''}</strong>
                            </div>
                            <div className="summary-row summary-row--total">
                                <span>Total</span><strong>${total}</strong>
                            </div>
                        </div>

                        <div className="modal-form-group">
                            <label><FaCreditCard /> Selecciona cómo pagar</label>
                            <div className="payment-selection-grid">
                                <button type="button"
                                    className={`payment-card ${paymentMethod === 'efectivo' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('efectivo')}>
                                    <FaMoneyBillWave /> <span>Efectivo</span>
                                </button>
                                <button type="button"
                                    className={`payment-card ${paymentMethod === 'tarjeta' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('tarjeta')}>
                                    <FaCreditCard /> <span>Tarjeta</span>
                                </button>
                            </div>
                        </div>

                        {error && <p className="modal-error">{error}</p>}

                        <div className="modal-actions-dual">
                            <button className="btn-modal-secondary" onClick={() => setStep(1)}>Atrás</button>
                            <button className="btn-modal-confirm" onClick={handleConfirm}
                                disabled={!paymentMethod || loading}>
                                {loading ? 'Procesando...' : 'Finalizar compra'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PASO 3: Éxito ── */}
                {step === 3 && (
                    <div className="modal-step-content success-animation fade-in">
                        <FaCheckCircle className="icon-success-final" />
                        <h2>¡Pedido realizado!</h2>
                        <p>Tu orden de <strong>{product.name}</strong> ha sido registrada.</p>
                        <div className="resumen-final-box">
                            <div className="summary-row">
                                <span>Producto</span><strong>{product.name}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Cantidad</span><strong>{qty} unidad{qty > 1 ? 'es' : ''}</strong>
                            </div>
                            <div className="summary-row">
                                <span>Pago</span>
                                <strong style={{ textTransform:'capitalize' }}>{paymentMethod}</strong>
                            </div>
                            <div className="summary-row summary-row--total">
                                <span>Total</span><strong>${total}</strong>
                            </div>
                        </div>
                        <button className="btn-modal-primary" onClick={onClose}>
                            Volver a la tienda
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ProductModal;