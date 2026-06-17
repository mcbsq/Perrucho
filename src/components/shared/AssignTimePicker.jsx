// src/components/shared/AssignTimePicker.jsx
//
// Se muestra en el ApptDetailPopup cuando una cita está en estado 'Pendiente'
// y no tiene `time` asignado (porque el cliente solo sugirió el día al
// reservar — ver ServiceModal.jsx). El groomer/admin elige un horario libre
// y al confirmar, la cita pasa a 'Confirmada' con esa hora ya fija.
//
// Usa validateSlot() de apptStatus.js para evitar choques de horario, y los
// mismos slots base (10:15–17:00) que ya existían en bookingRules.js.

import React, { useState, useMemo } from 'react';
import { FaClock, FaCheckCircle } from 'react-icons/fa';
import { getBookingSlots } from '../../utils/bookingRules';
import { validateSlot } from '../../utils/apptStatus';

const fmt12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const ALL_SLOTS = getBookingSlots();

/**
 * @param {Object} appt - la cita pendiente sin hora
 * @param {Array} allAppointments - todas las citas (para validar choques)
 * @param {Array} employees - usuarios con role 'empleado' (para capacidad)
 * @param {Function} onAssign - (time) => void — confirma con la hora elegida
 * @param {boolean} isUpdating
 */
const AssignTimePicker = ({ appt, allAppointments = [], employees = [], onAssign, isUpdating }) => {
    const [selected, setSelected] = useState('');
    const [warning,  setWarning]  = useState('');

    const slotsWithAvailability = useMemo(() => {
        return ALL_SLOTS.map(slot => {
            const check = validateSlot(allAppointments, appt.date, slot, employees, appt.id);
            return { slot, available: check.ok };
        });
    }, [allAppointments, appt.date, appt.id, employees]);

    const handlePick = (slot, available) => {
        if (!available) return;
        setSelected(slot);
        setWarning('');
    };

    const handleConfirm = () => {
        if (!selected) { setWarning('Elige un horario antes de confirmar.'); return; }
        const check = validateSlot(allAppointments, appt.date, selected, employees, appt.id);
        if (!check.ok) { setWarning(check.message); return; }
        onAssign(selected);
    };

    return (
        <div className="atp-wrap">
            <div className="atp-header">
                <FaClock /> <span>Esta cita llegó sin hora — el cliente solo sugirió el día. Asigna un horario para confirmarla.</span>
            </div>
            <div className="atp-slots-grid">
                {slotsWithAvailability.map(({ slot, available }) => (
                    <button
                        key={slot}
                        type="button"
                        className={`atp-slot ${selected === slot ? 'active' : ''} ${!available ? 'busy' : ''}`}
                        disabled={!available}
                        onClick={() => handlePick(slot, available)}
                        title={available ? fmt12(slot) : 'Sin disponibilidad'}
                    >
                        {fmt12(slot)}
                    </button>
                ))}
            </div>
            {warning && <p className="atp-warning">{warning}</p>}
            <button
                type="button"
                className="ds-btn ds-btn--confirm atp-confirm-btn"
                disabled={isUpdating || !selected}
                onClick={handleConfirm}
            >
                <FaCheckCircle /> {isUpdating ? 'Guardando...' : 'Asignar horario y confirmar'}
            </button>
        </div>
    );
};

export default AssignTimePicker;