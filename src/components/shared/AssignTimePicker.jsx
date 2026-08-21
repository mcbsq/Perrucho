// src/components/shared/AssignTimePicker.jsx
//
// Se muestra en el ApptDetailPopup cuando una cita está en estado 'Pendiente'
// y no tiene `time` asignado (porque el cliente solo sugirió el día al
// reservar — ver ServiceModal.jsx). El groomer/admin elige un horario libre
// y al confirmar, la cita pasa a 'Confirmada' con esa hora ya fija.
//
// Usa validateSlot() de apptStatus.js para evitar choques de horario. El
// horario base del día (antes una lista fija 10:15–17:00 en bookingRules.js,
// igual para cualquier negocio y cualquier servicio) ahora lo calcula el
// servidor según Settings.businessHours del negocio y la duración real del
// servicio de esta cita — un día cerrado no ofrece ningún slot.

import React, { useState, useEffect, useMemo } from 'react';
import { FaClock, FaCheckCircle } from 'react-icons/fa';
import { appointmentsApi } from '../../api/apiClient';
import { validateSlot } from '../../utils/apptStatus';

const fmt12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

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
    const [allSlots, setAllSlots] = useState([]);

    useEffect(() => {
        if (!appt.date) { setAllSlots([]); return; }
        // Si el cliente ya eligió empleado al reservar (appt.employeeId), la
        // disponibilidad se filtra a ESE empleado específico, no a la
        // capacidad agregada — mismo criterio que el resto del sistema.
        appointmentsApi.getAvailability(appt.date, appt.serviceId, appt.employeeId)
            .then(res => setAllSlots(res.slots || []))
            .catch(() => setAllSlots([]));
    }, [appt.date, appt.serviceId, appt.employeeId]);

    const slotsWithAvailability = useMemo(() => {
        return allSlots.map(slot => {
            const check = validateSlot(allAppointments, appt.date, slot, employees, appt.id);
            return { slot, available: check.ok };
        });
    }, [allSlots, allAppointments, appt.date, appt.id, employees]);

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
            {appt.employeeId && (
                <div className="atp-header">
                    <FaClock /> <span>El cliente pidió que lo atienda <strong>{employees.find(e => String(e.id) === String(appt.employeeId))?.name || 'este empleado'}</strong> — los horarios de abajo son la disponibilidad de esa persona.</span>
                </div>
            )}
            {allSlots.length === 0 && <p className="atp-warning">El negocio no atiende ese día — cambia la fecha de la cita.</p>}
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