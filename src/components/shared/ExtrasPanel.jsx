// src/components/shared/ExtrasPanel.jsx
// Panel de servicios adicionales para el popup de cita.
// Usado tanto en EmployeeDashboard como en AdminDashboard.
//
// Props:
//   appt       — cita completa (con appt.extras[] del backend)
//   services   — lista de servicios del DataContext
//   pets       — lista de mascotas (para calcular precio por peso)
//   onAdd      — async (appointmentId, { serviceId, price }) => void
//   onRemove   — async (appointmentId, extraId) => void
//   readOnly   — bool (solo lectura, sin botones)

import React, { useState } from 'react';
import { FaPlus, FaTimes, FaCheck } from 'react-icons/fa';
import { calcServicePrice } from '../../utils/pricingRules';

// Helpers para objetos anidados del backend
const getApptPetId = (a) => a.petId || a.pet?.id;

export const ExtrasPanel = ({ appt, services = [], pets = [], onAdd, onRemove, readOnly = false }) => {
    const [adding, setAdding]     = useState(false);
    const [selSvc, setSelSvc]     = useState('');
    const [saving, setSaving]     = useState(false);
    const [removing, setRemoving] = useState(null);

    const extras = appt?.extras || [];

    // Calcular precio automático según peso de la mascota
    const petId = getApptPetId(appt);
    const pet   = pets.find(p => String(p.id) === String(petId));

    const selectedSvc   = services.find(s => String(s.id) === String(selSvc));
    const previewPrice  = selectedSvc && pet
        ? calcServicePrice(selectedSvc, pet.weight)
        : selectedSvc?.price || 0;

    const handleAdd = async () => {
        if (!selSvc) return;
        setSaving(true);
        try {
            await onAdd(appt.id, {
                serviceId: parseInt(selSvc),
                price:     previewPrice,
            });
            setSelSvc('');
            setAdding(false);
        } catch (err) {
            console.error('Error agregando extra:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (extraId) => {
        setRemoving(extraId);
        try {
            await onRemove(appt.id, extraId);
        } catch (err) {
            console.error('Error eliminando extra:', err);
        } finally {
            setRemoving(null);
        }
    };

    // Servicios disponibles para agregar (excluir el servicio principal y los ya agregados)
    const extraIds = extras.map(e => String(e.serviceId || e.service?.id));
    const mainId   = String(appt?.serviceId || appt?.service?.id);
    const available = services.filter(s =>
        String(s.id) !== mainId && !extraIds.includes(String(s.id))
    );

    const totalExtras = extras.reduce((sum, e) => sum + Number(e.price || 0), 0);

    return (
        <div className="extras-panel">
            <div className="extras-panel-header">
                <span className="extras-panel-title">➕ Servicios adicionales</span>
                {totalExtras > 0 && (
                    <span className="extras-total">+${totalExtras}</span>
                )}
            </div>

            {/* Lista de extras ya agregados */}
            {extras.length > 0 && (
                <div className="extras-list">
                    {extras.map(extra => {
                        const svcName = extra.service?.title || services.find(s => String(s.id) === String(extra.serviceId))?.title || 'Servicio';
                        return (
                            <div key={extra.id} className="extras-item">
                                <span className="extras-item-name">{svcName}</span>
                                <span className="extras-item-price">${extra.price}</span>
                                {!readOnly && (
                                    <button
                                        className="extras-item-remove"
                                        onClick={() => handleRemove(extra.id)}
                                        disabled={removing === extra.id}
                                        title="Eliminar extra">
                                        {removing === extra.id ? '⏳' : <FaTimes />}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {extras.length === 0 && !adding && (
                <p className="extras-empty">Sin servicios adicionales</p>
            )}

            {/* Formulario para agregar */}
            {!readOnly && adding && (
                <div className="extras-add-form">
                    <select
                        value={selSvc}
                        onChange={e => setSelSvc(e.target.value)}
                        className="extras-select">
                        <option value="">Seleccionar servicio...</option>
                        {available.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                    </select>
                    {selSvc && (
                        <div className="extras-price-preview">
                            <span>Precio{pet ? ` (${pet.petName}, ~${pet.weight}kg)` : ''}:</span>
                            <strong>${previewPrice}</strong>
                        </div>
                    )}
                    <div className="extras-add-actions">
                        <button className="extras-btn-cancel" onClick={() => { setAdding(false); setSelSvc(''); }}>
                            Cancelar
                        </button>
                        <button className="extras-btn-confirm" onClick={handleAdd}
                            disabled={!selSvc || saving}>
                            {saving ? '⏳' : <><FaCheck /> Agregar</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Botón agregar */}
            {!readOnly && !adding && available.length > 0 && (
                <button className="extras-btn-add" onClick={() => setAdding(true)}>
                    <FaPlus /> Agregar servicio
                </button>
            )}
        </div>
    );
};

export default ExtrasPanel;