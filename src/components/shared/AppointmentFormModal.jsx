// src/components/shared/AppointmentFormModal.jsx
//
// "Nueva cita" desde la agenda (admin y empleado). Antes vivía como un
// <form> de 3 columnas de <select> sin etiqueta, ANIDADO dentro del modal de
// la agenda (520 px): los nombres largos, el texto "Sin horario disponible
// ese día" y el selector de fecha quedaban cortados. Ahora es un pop-up
// propio, montado en document.body (no hereda el overflow/transform de la
// agenda), con un campo por fila etiquetado y el pie de acciones fijo.
//
// Flujo: cliente → paciente (solo las mascotas ligadas a ESE cliente; una
// mascota puede tener varios dueños) → servicio → quién atiende/sucursal →
// fecha → horario disponible real del negocio.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaExclamationTriangle, FaCalendarCheck } from 'react-icons/fa';
import { appointmentsApi } from '../../api/apiClient';
import { validateSlot } from '../../utils/apptStatus';
import { calcServicePrice } from '../../utils/pricingRules';
import { getPetsOfClient, getPetOwnerIds } from '../../utils/petOwners';
import './AppointmentFormModal.css';

const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const AppointmentFormModal = ({
    appointments, pets, clients, services, employees = [], branches = [],
    petsEnabled = true, showEmployeePicker = true, initialDate, onSubmit, onClose,
}) => {
    const activeBranches = branches.filter(b => b.isActive !== false);
    const mainBranch = activeBranches.find(b => b.isMain) || activeBranches[0];
    const [form, setForm] = useState({
        clientId: '', petId: '', serviceId: '', employeeId: '',
        branchId: mainBranch ? String(mainBranch.id) : '',
        date: initialDate || todayISO(), time: '', notes: '',
    });
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const firstFieldRef = useRef(null);

    const set = (patch) => { setForm(f => ({ ...f, ...patch })); setError(''); };

    const sortedClients = useMemo(
        () => [...clients].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')),
        [clients]
    );
    const clientPets = useMemo(
        () => (form.clientId ? getPetsOfClient(pets, form.clientId) : []).filter(p => (p.status || 'activo') === 'activo'),
        [pets, form.clientId]
    );
    const pet = pets.find(p => String(p.id) === String(form.petId));
    const service = services.find(s => String(s.id) === String(form.serviceId));
    const price = service ? calcServicePrice(service, pet?.weight) : 0;

    // Un cliente con una sola mascota activa: se elige sola.
    useEffect(() => {
        if (!petsEnabled) return;
        if (clientPets.length === 1) set({ petId: String(clientPets[0].id) });
        else if (!clientPets.some(p => String(p.id) === String(form.petId))) set({ petId: '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.clientId, clientPets.length]);

    useEffect(() => {
        if (!form.date) { setSlots([]); return; }
        let cancelled = false;
        setLoadingSlots(true);
        appointmentsApi.getAvailability(form.date, form.serviceId, form.employeeId)
            .then(res => { if (!cancelled) setSlots(res.slots || []); })
            .catch(() => { if (!cancelled) setSlots([]); })
            .finally(() => { if (!cancelled) setLoadingSlots(false); });
        return () => { cancelled = true; };
    }, [form.date, form.serviceId, form.employeeId]);

    useEffect(() => {
        firstFieldRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.clientId) { setError('Elige al cliente.'); return; }
        if (petsEnabled && !form.petId) { setError(clientPets.length ? 'Elige al paciente.' : 'Este cliente no tiene mascotas activas — regístrala primero en Pacientes.'); return; }
        if (!form.serviceId) { setError('Elige el servicio.'); return; }
        if (!form.time) { setError('Elige un horario disponible.'); return; }
        const check = validateSlot(appointments, form.date, form.time, employees);
        if (!check.ok) { setError(check.message); return; }
        setSaving(true);
        try {
            await onSubmit({
                clientId: Number(form.clientId),
                petId: petsEnabled && form.petId ? Number(form.petId) : null,
                serviceId: Number(form.serviceId),
                employeeId: form.employeeId ? Number(form.employeeId) : null,
                branchId: form.branchId ? Number(form.branchId) : null,
                date: form.date,
                time: form.time,
                notes: form.notes.trim() || null,
                status: 'Pendiente',
                finalPrice: price,
                // Solo para los toasts/notificaciones del dashboard — el API los descarta.
                serviceName: service?.title,
                petName: pet?.petName,
            });
            onClose();
        } catch (err) {
            setError(err?.message || 'No se pudo agendar la cita.');
        } finally {
            setSaving(false);
        }
    };

    const timeLabel = loadingSlots ? 'Buscando horarios…'
        : !form.date ? 'Elige una fecha'
        : slots.length ? 'Elige un horario'
        : 'Sin horarios disponibles ese día';

    return createPortal(
        <div className="afm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <form className="afm-sheet" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="afm-title" noValidate>
                <header className="afm-header">
                    <div>
                        <h3 id="afm-title">Nueva cita</h3>
                        <p>Agenda directo en el calendario del negocio.</p>
                    </div>
                    <button type="button" className="afm-close" onClick={onClose} aria-label="Cerrar"><FaTimes /></button>
                </header>

                <div className="afm-body">
                    <div className="afm-field afm-span">
                        <label htmlFor="afm-client">Cliente</label>
                        <select id="afm-client" ref={firstFieldRef} value={form.clientId} onChange={e => set({ clientId: e.target.value })}>
                            <option value="">Elige un cliente…</option>
                            {sortedClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
                        </select>
                    </div>

                    {petsEnabled && (
                        <div className="afm-field afm-span">
                            <label htmlFor="afm-pet">Paciente</label>
                            <select id="afm-pet" value={form.petId} onChange={e => set({ petId: e.target.value })} disabled={!form.clientId}>
                                <option value="">{!form.clientId ? 'Primero elige al cliente' : clientPets.length ? 'Elige un paciente…' : 'Este cliente no tiene mascotas activas'}</option>
                                {clientPets.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.petName}{p.breed ? ` · ${p.breed}` : ''}{p.weight ? ` · ~${p.weight} kg` : ''}{getPetOwnerIds(p).length > 1 ? ' · compartida' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="afm-field afm-span">
                        <label htmlFor="afm-service">Servicio</label>
                        <select id="afm-service" value={form.serviceId} onChange={e => set({ serviceId: e.target.value, time: '' })}>
                            <option value="">Elige un servicio…</option>
                            {services.map(s => <option key={s.id} value={s.id}>{s.title}{s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}</option>)}
                        </select>
                    </div>

                    {showEmployeePicker && (
                        <div className={`afm-field ${activeBranches.length > 1 ? '' : 'afm-span'}`}>
                            <label htmlFor="afm-employee">Quién atiende <span className="afm-optional">opcional</span></label>
                            <select id="afm-employee" value={form.employeeId} onChange={e => set({ employeeId: e.target.value, time: '' })}>
                                <option value="">Cualquiera disponible</option>
                                {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    )}

                    {activeBranches.length > 1 && (
                        <div className={`afm-field ${showEmployeePicker ? '' : 'afm-span'}`}>
                            <label htmlFor="afm-branch">Sucursal</label>
                            <select id="afm-branch" value={form.branchId} onChange={e => set({ branchId: e.target.value })}>
                                {activeBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="afm-field">
                        <label htmlFor="afm-date">Fecha</label>
                        <input id="afm-date" type="date" value={form.date} min={todayISO()} onChange={e => set({ date: e.target.value, time: '' })} />
                    </div>

                    <div className="afm-field">
                        <label htmlFor="afm-time">Horario</label>
                        <select id="afm-time" value={form.time} onChange={e => set({ time: e.target.value })} disabled={!slots.length}>
                            <option value="">{timeLabel}</option>
                            {slots.map(t => {
                                const check = validateSlot(appointments, form.date, t, employees);
                                return <option key={t} value={t} disabled={!check.ok}>{t}{check.ok ? '' : ' · lleno'}</option>;
                            })}
                        </select>
                    </div>

                    <div className="afm-field afm-span">
                        <label htmlFor="afm-notes">Notas <span className="afm-optional">opcional</span></label>
                        <textarea id="afm-notes" rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })}
                            placeholder="Indicaciones para quien atiende" />
                    </div>

                    {price > 0 && (
                        <div className="afm-estimate afm-span">
                            <span>Estimado según catálogo</span>
                            <strong>~${price.toLocaleString('es-MX')}</strong>
                        </div>
                    )}
                </div>

                <footer className="afm-footer">
                    {error
                        ? <p className="afm-error" role="alert"><FaExclamationTriangle aria-hidden="true" /> {error}</p>
                        : <span />}
                    <div className="afm-actions">
                        <button type="button" className="afm-btn afm-btn--ghost" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="afm-btn afm-btn--primary" disabled={saving}>
                            <FaCalendarCheck aria-hidden="true" /> {saving ? 'Agendando…' : 'Agendar cita'}
                        </button>
                    </div>
                </footer>
            </form>
        </div>,
        document.body
    );
};

export default AppointmentFormModal;
