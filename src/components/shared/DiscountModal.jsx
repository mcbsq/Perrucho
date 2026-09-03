// src/components/shared/DiscountModal.jsx
//
// Punto 1 del feedback del cliente: "agregar opción para descuentos, ya sea
// por porcentaje o por cantidad [monto]" al carrito del POS. Pop-up simple
// con el cálculo del total en automático — compartido entre AdminDashboard
// y EmployeeDashboard, que tienen el mismo carrito duplicado.
import React, { useState } from 'react';

const DiscountModal = ({ Modal, initial, cartTotal, onApply, onClose }) => {
    const [type, setType] = useState(initial?.type || 'percent');
    const [value, setValue] = useState(initial?.value ?? '');

    const numValue = Number(value) || 0;
    const amount = numValue <= 0 ? 0
        : type === 'percent' ? cartTotal * (Math.min(numValue, 100) / 100)
        : Math.min(numValue, cartTotal);
    const finalTotal = Math.max(0, cartTotal - amount);

    const handleApply = () => { onApply({ type, value }); onClose(); };
    const handleRemove = () => { onApply({ type: 'percent', value: '' }); onClose(); };

    return (
        <Modal title="🏷️ Descuento" onClose={onClose}>
            <div className="ds-form">
                <div className="discount-type-toggle">
                    <button type="button" className={type === 'percent' ? 'active' : ''} onClick={() => setType('percent')}>% Porcentaje</button>
                    <button type="button" className={type === 'amount' ? 'active' : ''} onClick={() => setType('amount')}>$ Monto fijo</button>
                </div>
                <div className="ds-field" style={{ margin: '14px 0' }}>
                    <label>{type === 'percent' ? 'Porcentaje de descuento' : 'Monto a descontar'}</label>
                    <input
                        type="number" min="0" max={type === 'percent' ? 100 : undefined}
                        value={value} onChange={e => setValue(e.target.value)}
                        placeholder={type === 'percent' ? 'Ej. 10' : 'Ej. 50'}
                        autoFocus
                    />
                </div>
                <div className="discount-preview">
                    <div><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                    <div><span>Descuento</span><span>−${amount.toFixed(2)}</span></div>
                    <div className="discount-preview-total"><span>Total</span><strong>${finalTotal.toFixed(2)}</strong></div>
                </div>
                <div className="ds-form-actions">
                    {initial?.value && <button type="button" className="ds-btn ds-btn--secondary" onClick={handleRemove}>Quitar descuento</button>}
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="button" className="ds-btn ds-btn--primary" onClick={handleApply} disabled={numValue <= 0}>Aplicar</button>
                </div>
            </div>
        </Modal>
    );
};

export default DiscountModal;
