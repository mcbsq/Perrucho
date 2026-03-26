// src/pages/employee/EmployeeDashboard.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { appointmentsApi } from '../../api/apiClient';
import {
    FaPaw, FaPlusCircle, FaSignOutAlt, FaUserTie, FaUsers,
    FaCalendarAlt, FaNotesMedical, FaClock, FaCheckCircle,
    FaTimes, FaSave, FaHistory, FaEdit, FaTrash,
    FaBoxOpen, FaExclamationTriangle, FaClipboardList,
    FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import './EmployeeDashboard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const formatDateLong = (str) => {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 — 19:00
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const parseTime = (t) => {
    if (!t) return 8 * 60;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
};

const hueFromId = (id) => {
    const n = typeof id === 'string'
        ? id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
        : Number(id);
    return (n * 137) % 360;
};

// ─── Modal genérico ──────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide, full }) => (
    <div className="emp-modal-overlay" onClick={onClose}>
        <div
            className={`emp-modal-box ${wide ? 'modal-wide' : ''} ${full ? 'modal-full' : ''}`}
            onClick={e => e.stopPropagation()}
        >
            <div className="emp-modal-header">
                <h3>{title}</h3>
                <button className="emp-modal-close" onClick={onClose}><FaTimes /></button>
            </div>
            <div className="emp-modal-body">{children}</div>
        </div>
    </div>
);

// ─── Modal: Detalle de cita ───────────────────────────────────────────────────
const ApptDetailModal = ({ appt, pets, clients, onMarkDone, onOpenExp, onClose }) => {
    const pet   = pets.find(p => String(p.id) === String(appt.petId));
    const owner = pet ? clients.find(c => String(c.id) === String(pet.ownerId)) : null;
    const isDone = appt.status === 'Atendido';

    return (
        <Modal title="Detalle de cita" onClose={onClose}>
            <div className="appt-detail-header">
                <div className="appt-detail-avatar" style={{
                    background: `hsl(${hueFromId(appt.petId)},65%,60%)`
                }}>
                    {pet?.petName?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                    <h4>{pet?.petName || 'Mascota no encontrada'}</h4>
                    <span>{pet?.breed || '—'} · {pet?.weight} kg</span>
                    {owner && <span className="appt-detail-owner">{owner.name} · {owner.phone}</span>}
                </div>
            </div>

            <div className="appt-detail-grid">
                <div className="appt-detail-row">
                    <span>Servicio</span><strong>{appt.serviceName || '—'}</strong>
                </div>
                <div className="appt-detail-row">
                    <span>Hora</span><strong>{appt.time || '—'}</strong>
                </div>
                <div className="appt-detail-row">
                    <span>Fecha</span><strong>{formatDateLong(appt.date)}</strong>
                </div>
                <div className="appt-detail-row">
                    <span>Precio</span><strong>${appt.finalPrice || 0}</strong>
                </div>
                <div className="appt-detail-row">
                    <span>Estado</span>
                    <span className={`emp-status-pill ${isDone ? 'done' : 'pending'}`}>
                        {isDone ? <FaCheckCircle /> : <FaClock />} {appt.status}
                    </span>
                </div>
            </div>

            {pet?.notes && (
                <div className="appt-detail-notes">
                    <span className="emp-notes-label">Notas / alergias</span>
                    <p>{pet.notes}</p>
                </div>
            )}

            {pet?.history?.length > 0 && (
                <div className="appt-detail-notes" style={{marginTop: 10}}>
                    <span className="emp-notes-label">Última visita</span>
                    <p><strong>{pet.history[pet.history.length - 1].date}</strong> — {pet.history[pet.history.length - 1].detail}</p>
                </div>
            )}

            <div className="appt-detail-actions">
                {pet && (
                    <button className="emp-btn-secondary" onClick={() => onOpenExp(pet)}>
                        <FaEdit /> Expediente completo
                    </button>
                )}
                {!isDone && (
                    <button className="emp-btn-done" onClick={() => onMarkDone(appt)}>
                        <FaCheckCircle /> Marcar atendido
                    </button>
                )}
            </div>
        </Modal>
    );
};

// ─── Modal: Calendario tipo Google Calendar ───────────────────────────────────
const CalendarModal = ({
    appointments, pets, clients, services,
    onAddAppt, onMarkDone, onDeleteAppt, onOpenExp, onClose
}) => {
    const now = new Date();
    const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
    const [calView,  setCalView]  = useState('week'); // 'month' | 'week' | 'day'
    const [dayDate,  setDayDate]  = useState(now);
    const [selAppt,  setSelAppt]  = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [newAppt,  setNewAppt]  = useState({
        petId:'', serviceId:'', time:'', date: todayStr(), status:'Pendiente', finalPrice:0
    });

    // ── Precio dinámico ───────────────────────────────────────────────────────
    const calcPrice = (base, w) => {
        const weight = Number(w), p = Number(base);
        if (weight <= 5)  return p;
        if (weight <= 12) return +(p * 1.25).toFixed(2);
        if (weight <= 25) return +(p * 1.50).toFixed(2);
        return +(p * 2).toFixed(2);
    };
    useEffect(() => {
        if (newAppt.petId && newAppt.serviceId) {
            const pet = pets.find(p => String(p.id) === String(newAppt.petId));
            const svc = services.find(s => String(s.id) === String(newAppt.serviceId));
            if (pet && svc) setNewAppt(prev => ({ ...prev, finalPrice: calcPrice(svc.price, pet.weight) }));
        }
    }, [newAppt.petId, newAppt.serviceId]);

    const handleCreateAppt = async (e) => {
        e.preventDefault();
        await onAddAppt(newAppt);
        setShowForm(false);
        setNewAppt({ petId:'', serviceId:'', time:'', date: todayStr(), status:'Pendiente', finalPrice:0 });
    };

    // ── Helpers de vista ──────────────────────────────────────────────────────
    const apptsByDate = useMemo(() => {
        const map = {};
        appointments.forEach(a => {
            if (!map[a.date]) map[a.date] = [];
            map[a.date].push(a);
        });
        return map;
    }, [appointments]);

    const getApptColor = (appt) => {
        if (appt.status === 'Atendido') return { bg: '#e1f5ee', border: '#1D9E75', text: '#085041' };
        const h = hueFromId(appt.petId);
        return { bg: `hsl(${h},70%,94%)`, border: `hsl(${h},60%,55%)`, text: `hsl(${h},55%,30%)` };
    };

    // ── Vista MONTH ───────────────────────────────────────────────────────────
    const MonthView = () => {
        const year  = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const first = new Date(year, month, 1).getDay();
        const days  = new Date(year, month + 1, 0).getDate();
        const cells = Array.from({ length: first + days }, (_, i) =>
            i < first ? null : i - first + 1
        );
        while (cells.length % 7 !== 0) cells.push(null);

        const todayDate = now.getDate();
        const todayMonth = now.getMonth();
        const todayYear = now.getFullYear();

        return (
            <div className="cal-month">
                <div className="cal-month-header">
                    {DAYS_SHORT.map(d => <div key={d} className="cal-month-day-label">{d}</div>)}
                </div>
                <div className="cal-month-grid">
                    {cells.map((day, i) => {
                        if (!day) return <div key={i} className="cal-cell cal-cell--empty" />;
                        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const dayAppts = apptsByDate[dateStr] || [];
                        const isToday  = day === todayDate && month === todayMonth && year === todayYear;
                        return (
                            <div
                                key={i}
                                className={`cal-cell ${isToday ? 'cal-cell--today' : ''}`}
                                onClick={() => { setDayDate(new Date(year, month, day)); setCalView('day'); }}
                            >
                                <span className="cal-cell-num">{day}</span>
                                {dayAppts.slice(0, 3).map(a => {
                                    const c = getApptColor(a);
                                    return (
                                        <div
                                            key={a.id}
                                            className="cal-event-chip"
                                            style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, color: c.text }}
                                            onClick={e => { e.stopPropagation(); setSelAppt(a); }}
                                        >
                                            {a.time} {a.petName || a.serviceName}
                                        </div>
                                    );
                                })}
                                {dayAppts.length > 3 && (
                                    <div className="cal-more">+{dayAppts.length - 3} más</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ── Vista WEEK ────────────────────────────────────────────────────────────
    const WeekView = () => {
        // Semana que contiene viewDate (o dayDate si es week)
        const base  = calView === 'week' ? dayDate : now;
        const start = new Date(base);
        start.setDate(start.getDate() - start.getDay()); // domingo
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });

        return (
            <div className="cal-week">
                {/* Cabecera de días */}
                <div className="cal-week-header">
                    <div className="cal-time-gutter" />
                    {weekDays.map((d, i) => {
                        const isToday = d.toDateString() === now.toDateString();
                        return (
                            <div
                                key={i}
                                className={`cal-week-day-label ${isToday ? 'today' : ''}`}
                                onClick={() => { setDayDate(d); setCalView('day'); }}
                            >
                                <span className="wdl-name">{DAYS_SHORT[d.getDay()]}</span>
                                <span className={`wdl-num ${isToday ? 'today-circle' : ''}`}>{d.getDate()}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Grid horario */}
                <div className="cal-week-scroll">
                    <div className="cal-week-grid">
                        {HOURS.map(h => (
                            <div key={h} className="cal-hour-row">
                                <div className="cal-time-label">{h}:00</div>
                                {weekDays.map((d, di) => {
                                    const dateStr = d.toISOString().split('T')[0];
                                    const slot = (apptsByDate[dateStr] || []).filter(a => {
                                        const min = parseTime(a.time);
                                        return min >= h * 60 && min < (h + 1) * 60;
                                    });
                                    return (
                                        <div key={di} className="cal-hour-cell">
                                            {slot.map(a => {
                                                const c = getApptColor(a);
                                                return (
                                                    <div
                                                        key={a.id}
                                                        className="cal-event-block"
                                                        style={{ background: c.bg, borderLeft: `4px solid ${c.border}`, color: c.text }}
                                                        onClick={() => setSelAppt(a)}
                                                    >
                                                        <strong>{a.time}</strong>
                                                        <span>{a.petName}</span>
                                                        <span>{a.serviceName}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // ── Vista DAY ─────────────────────────────────────────────────────────────
    const DayView = () => {
        const dateStr = dayDate.toISOString().split('T')[0];
        const dayAppts = (apptsByDate[dateStr] || []).sort((a,b) => parseTime(a.time) - parseTime(b.time));

        return (
            <div className="cal-day">
                <div className="cal-day-label">
                    {formatDateLong(dateStr)}
                    <span className="cal-day-count">{dayAppts.length} cita{dayAppts.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="cal-day-scroll">
                    {HOURS.map(h => {
                        const slot = dayAppts.filter(a => {
                            const min = parseTime(a.time);
                            return min >= h * 60 && min < (h + 1) * 60;
                        });
                        return (
                            <div key={h} className="cal-day-row">
                                <div className="cal-time-label">{h}:00</div>
                                <div className="cal-day-events">
                                    {slot.map(a => {
                                        const c = getApptColor(a);
                                        const pet   = pets.find(p => String(p.id) === String(a.petId));
                                        const owner = pet ? clients.find(cl => String(cl.id) === String(pet.ownerId)) : null;
                                        return (
                                            <div
                                                key={a.id}
                                                className="cal-day-event"
                                                style={{ background: c.bg, borderLeft: `5px solid ${c.border}`, color: c.text }}
                                                onClick={() => setSelAppt(a)}
                                            >
                                                <div className="cal-day-event-top">
                                                    <strong>{a.time} — {a.petName}</strong>
                                                    <span className={`emp-status-pill ${a.status === 'Atendido' ? 'done' : 'pending'}`}>
                                                        {a.status === 'Atendido' ? <FaCheckCircle /> : <FaClock />} {a.status}
                                                    </span>
                                                </div>
                                                <span>{a.serviceName}</span>
                                                {owner && <span className="cal-day-owner">{owner.name} · {owner.phone}</span>}
                                                <span className="cal-day-price">${a.finalPrice}</span>
                                            </div>
                                        );
                                    })}
                                    {slot.length === 0 && <div className="cal-empty-slot" />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ── Navegación ────────────────────────────────────────────────────────────
    const goBack = () => {
        if (calView === 'month') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        } else if (calView === 'week') {
            const d = new Date(dayDate); d.setDate(d.getDate() - 7); setDayDate(d);
        } else {
            const d = new Date(dayDate); d.setDate(d.getDate() - 1); setDayDate(d);
        }
    };

    const goNext = () => {
        if (calView === 'month') {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        } else if (calView === 'week') {
            const d = new Date(dayDate); d.setDate(d.getDate() + 7); setDayDate(d);
        } else {
            const d = new Date(dayDate); d.setDate(d.getDate() + 1); setDayDate(d);
        }
    };

    const goToday = () => {
        setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setDayDate(now);
    };

    const headerLabel = () => {
        if (calView === 'month') return `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
        if (calView === 'day')   return formatDateLong(dayDate.toISOString().split('T')[0]);
        // week: rango
        const start = new Date(dayDate);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start); end.setDate(end.getDate() + 6);
        return `${start.getDate()} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
    };

    return (
        <>
            <Modal title="Calendario de citas" onClose={onClose} full>
                {/* Barra de controles */}
                <div className="cal-toolbar">
                    <div className="cal-nav">
                        <button className="cal-nav-btn" onClick={goBack}><FaChevronLeft /></button>
                        <button className="cal-today-btn" onClick={goToday}>Hoy</button>
                        <button className="cal-nav-btn" onClick={goNext}><FaChevronRight /></button>
                        <span className="cal-period-label">{headerLabel()}</span>
                    </div>
                    <div className="cal-view-switcher">
                        {['month','week','day'].map(v => (
                            <button
                                key={v}
                                className={`cal-view-btn ${calView === v ? 'active' : ''}`}
                                onClick={() => setCalView(v)}
                            >
                                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
                            </button>
                        ))}
                        <button
                            className="emp-btn-primary sm"
                            onClick={() => setShowForm(v => !v)}
                            style={{marginLeft: 8}}
                        >
                            <FaPlusCircle /> Nueva cita
                        </button>
                    </div>
                </div>

                {/* Formulario nueva cita */}
                {showForm && (
                    <form className="cal-appt-form fade-in" onSubmit={handleCreateAppt}>
                        <div className="cal-form-grid">
                            <select value={newAppt.petId}
                                onChange={e => setNewAppt({...newAppt, petId: e.target.value})} required>
                                <option value="">Paciente...</option>
                                {pets.map(p => <option key={p.id} value={p.id}>{p.petName}</option>)}
                            </select>
                            <select value={newAppt.serviceId}
                                onChange={e => setNewAppt({...newAppt, serviceId: e.target.value})} required>
                                <option value="">Servicio...</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                            <input type="date" value={newAppt.date}
                                onChange={e => setNewAppt({...newAppt, date: e.target.value})} required />
                            <input type="time" value={newAppt.time}
                                onChange={e => setNewAppt({...newAppt, time: e.target.value})} required />
                        </div>
                        {newAppt.finalPrice > 0 && (
                            <div className="emp-price-preview" style={{marginBottom: 8}}>
                                Precio estimado: <strong>${newAppt.finalPrice}</strong>
                            </div>
                        )}
                        <div style={{display:'flex', gap:8}}>
                            <button type="submit" className="emp-btn-primary sm">Confirmar</button>
                            <button type="button" className="emp-btn-ghost sm" onClick={() => setShowForm(false)}>Cancelar</button>
                        </div>
                    </form>
                )}

                {/* Vista del calendario */}
                <div className="cal-view-container">
                    {calView === 'month' && <MonthView />}
                    {calView === 'week'  && <WeekView />}
                    {calView === 'day'   && <DayView />}
                </div>
            </Modal>

            {/* Modal detalle de cita (encima del calendario) */}
            {selAppt && (
                <ApptDetailModal
                    appt={selAppt}
                    pets={pets}
                    clients={clients}
                    onMarkDone={async (a) => {
                        await onMarkDone(a);
                        setSelAppt(prev => prev?.id === a.id ? {...prev, status:'Atendido'} : prev);
                    }}
                    onOpenExp={(pet) => { onOpenExp(pet); setSelAppt(null); }}
                    onClose={() => setSelAppt(null)}
                />
            )}
        </>
    );
};

// ─── Modal: Expediente clínico completo ──────────────────────────────────────
const MedicalModal = ({ pet, clients, onSave, onClose }) => {
    const [notes,       setNotes]       = useState(pet.notes || '');
    const [sessionNote, setSessionNote] = useState('');
    const [history,     setHistory]     = useState(pet.history || []);
    const owner = clients.find(c => String(c.id) === String(pet.ownerId));

    const addEntry = () => {
        if (!sessionNote.trim()) return;
        setHistory(prev => [...prev, {
            date:   new Date().toLocaleDateString('es-MX'),
            detail: sessionNote.trim(), author: 'Empleado'
        }]);
        setSessionNote('');
    };

    return (
        <Modal title={`Expediente — ${pet.petName}`} onClose={onClose} wide>
            <div className="exp-patient-header">
                <div className="exp-avatar" style={{ background: `hsl(${hueFromId(pet.id)},65%,60%)` }}>
                    {pet.petName?.[0]?.toUpperCase()}
                </div>
                <div>
                    <h4>{pet.petName}</h4>
                    <span>{pet.breed || '—'} · {pet.weight} kg</span>
                    <span className="exp-owner">Dueño: {owner?.name || 'Sin asignar'} {owner?.phone ? `· ${owner.phone}` : ''}</span>
                </div>
            </div>
            <div className="exp-section">
                <label className="exp-label"><FaNotesMedical /> Notas generales / alergias</label>
                <textarea className="exp-textarea" rows={3} value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Alergias, condiciones crónicas, indicaciones permanentes..." />
            </div>
            <div className="exp-section">
                <label className="exp-label"><FaPlusCircle /> Registrar nota de esta sesión</label>
                <div className="exp-session-row">
                    <textarea className="exp-textarea sm" rows={2} value={sessionNote}
                        onChange={e => setSessionNote(e.target.value)}
                        placeholder="Servicio aplicado, medicamentos, observaciones..." />
                    <button className="btn-add-entry" onClick={addEntry} disabled={!sessionNote.trim()}>
                        Agregar
                    </button>
                </div>
            </div>
            {history.length > 0 && (
                <div className="exp-section">
                    <label className="exp-label"><FaHistory /> Historial de visitas</label>
                    <div className="exp-history">
                        {[...history].reverse().map((h, i) => (
                            <div key={i} className="exp-history-entry">
                                <div className="exp-history-meta">
                                    <span className="exp-history-date">{h.date}</span>
                                    {h.author && <span className="exp-history-author">{h.author}</span>}
                                </div>
                                <p className="exp-history-detail">{h.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <button className="btn-save-exp" onClick={() => onSave({ ...pet, notes, history })}>
                <FaSave /> Guardar expediente
            </button>
        </Modal>
    );
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
const EmployeeDashboard = () => {
    const {
        products, pets, clients, services,
        addClient, updateClient,
        addPet, updatePet,
    } = useData();
    const { logout, user } = useAuth();

    const [tab,       setTab]       = useState('agenda');
    const [editingId, setEditingId] = useState(null);
    const [searchTerm,setSearchTerm]= useState('');

    // ── Modales ───────────────────────────────────────────────────────────────
    const [showCalendar, setShowCalendar] = useState(false);
    const [medicalPet,   setMedicalPet]   = useState(null);

    // ── Agenda ────────────────────────────────────────────────────────────────
    const [appointments, setAppointments] = useState([]);
    const [apptLoading,  setApptLoading]  = useState(false);
    const [selectedAppt, setSelectedAppt] = useState(null);

    const loadAppointments = useCallback(async () => {
        setApptLoading(true);
        try { setAppointments(await appointmentsApi.getAll()); }
        catch(e) { console.error(e); }
        finally  { setApptLoading(false); }
    }, []);
    useEffect(() => { loadAppointments(); }, [loadAppointments]);

    const todayAppts = useMemo(() =>
        appointments
            .filter(a => a.date === todayStr())
            .sort((a,b) => (a.time||'').localeCompare(b.time||'')),
        [appointments]
    );

    const kpis = useMemo(() => ({
        total:     todayAppts.length,
        atendidas: todayAppts.filter(a => a.status === 'Atendido').length,
        pendientes:todayAppts.filter(a => a.status !== 'Atendido').length,
        stockBajo: products.filter(p => Number(p.stock) < 5).length,
    }), [todayAppts, products]);

    // ── Handlers de citas ─────────────────────────────────────────────────────
    const handleAddAppt = async (form) => {
        const pet = pets.find(p => String(p.id) === String(form.petId));
        const svc = services.find(s => String(s.id) === String(form.serviceId));
        const created = await appointmentsApi.create({
            ...form,
            petName:     pet?.petName,
            serviceName: svc?.title,
        });
        setAppointments(prev => [...prev, created]);
    };

    const handleMarkDone = async (appo) => {
        try {
            const updated = await appointmentsApi.update(appo.id, { status: 'Atendido' });
            setAppointments(prev => prev.map(a => a.id === appo.id ? { ...a, ...updated } : a));
            setSelectedAppt(prev => prev?.id === appo.id ? { ...prev, status:'Atendido' } : prev);
        } catch(e) { console.error(e); }
    };

    const handleDeleteAppt = async (id) => {
        try { await appointmentsApi.delete(id); }
        catch(e) { console.error(e); }
        setAppointments(prev => prev.filter(a => a.id !== id));
        if (selectedAppt?.id === id) setSelectedAppt(null);
    };

    const saveMedicalFile = async (updatedPet) => {
        await updatePet(updatedPet.id, updatedPet);
        setMedicalPet(null);
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const [clientForm, setClientForm] = useState({ name:'', phone:'', email:'' });
    const [petForm,    setPetForm]    = useState({ petName:'', breed:'', weight:'', ownerId:'', notes:'', history:[] });

    const handleSave = async (type, e) => {
        e.preventDefault();
        if (type === 'client') editingId ? await updateClient(editingId, clientForm) : await addClient(clientForm);
        if (type === 'pet')    editingId ? await updatePet(editingId, petForm)        : await addPet(petForm);
        cancelEdit();
    };

    const startEdit = (type, item) => {
        setEditingId(item.id);
        if (type === 'client') setClientForm(item);
        if (type === 'pet')    setPetForm(item);
        window.scrollTo({ top:0, behavior:'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setClientForm({ name:'', phone:'', email:'' });
        setPetForm({ petName:'', breed:'', weight:'', ownerId:'', notes:'', history:[] });
    };

    // ── Selección de cita (panel lateral) ────────────────────────────────────
    const selectedPet   = selectedAppt ? pets.find(p => String(p.id) === String(selectedAppt.petId))   : null;
    const selectedOwner = selectedPet  ? clients.find(c => String(c.id) === String(selectedPet.ownerId)) : null;

    const NAV = [
        { id:'agenda',    icon:<FaCalendarAlt />, label:'Agenda'    },
        { id:'clientes',  icon:<FaUsers />,        label:'Clientes'  },
        { id:'pacientes', icon:<FaPaw />,          label:'Pacientes' },
        { id:'inventario',icon:<FaBoxOpen />,      label:'Inventario'},
    ];

    return (
        <div className="emp-layout">

            {/* ── MODALES ── */}
            {showCalendar && (
                <CalendarModal
                    appointments={appointments}
                    pets={pets} clients={clients} services={services}
                    onAddAppt={handleAddAppt}
                    onMarkDone={handleMarkDone}
                    onDeleteAppt={handleDeleteAppt}
                    onOpenExp={(pet) => setMedicalPet(pet)}
                    onClose={() => setShowCalendar(false)}
                />
            )}
            {medicalPet && (
                <MedicalModal
                    pet={medicalPet} clients={clients}
                    onSave={saveMedicalFile}
                    onClose={() => setMedicalPet(null)}
                />
            )}

            {/* ── TOPBAR ── */}
            <header className="emp-topbar">
                <div className="emp-topbar-left">
                    <span className="emp-logo">perrucho<span>.</span></span>
                    <span className="emp-role-badge">Staff</span>
                </div>
                <div className="emp-topbar-right">
                    <span className="emp-greeting"><FaUserTie /> Hola, <strong>{user?.name || 'Empleado'}</strong></span>
                    <button className="emp-logout-btn" onClick={logout}><FaSignOutAlt /></button>
                </div>
            </header>

            {/* ── SIDEBAR ── */}
            <aside className="emp-sidebar">
                <nav className="emp-sidebar-nav">
                    {NAV.map(item => (
                        <button key={item.id}
                            className={`emp-nav-btn ${tab === item.id ? 'active' : ''}`}
                            onClick={() => setTab(item.id)} title={item.label}>
                            {item.icon}
                            <span className="emp-nav-label">{item.label}</span>
                        </button>
                    ))}
                </nav>
                <button className="emp-sidebar-logout" onClick={logout}><FaSignOutAlt /></button>
            </aside>

            {/* ── MAIN ── */}
            <main className="emp-main">

                {/* ══ AGENDA ══ */}
                {tab === 'agenda' && (
                    <div className="fade-in">
                        <div className="emp-page-header">
                            <div>
                                <h2>Agenda del día</h2>
                                <p>{formatDateLong(todayStr())}</p>
                            </div>
                            <button className="emp-btn-primary" onClick={() => setShowCalendar(true)}>
                                <FaCalendarAlt /> Ver calendario
                            </button>
                        </div>

                        {/* KPIs — citas hoy abre el calendario */}
                        <div className="emp-kpi-row">
                            <div
                                className="emp-kpi emp-kpi--lavender emp-kpi--clickable"
                                onClick={() => setShowCalendar(true)}
                                title="Ver calendario completo"
                            >
                                <span className="emp-kpi-num">{kpis.total}</span>
                                <span className="emp-kpi-label">Citas hoy</span>
                                <span className="emp-kpi-hint">Ver calendario →</span>
                            </div>
                            <div className="emp-kpi emp-kpi--mint">
                                <span className="emp-kpi-num">{kpis.atendidas}</span>
                                <span className="emp-kpi-label">Atendidas</span>
                            </div>
                            <div className="emp-kpi emp-kpi--amber">
                                <span className="emp-kpi-num">{kpis.pendientes}</span>
                                <span className="emp-kpi-label">Pendientes</span>
                            </div>
                            <div className="emp-kpi emp-kpi--red">
                                <span className="emp-kpi-num">{kpis.stockBajo}</span>
                                <span className="emp-kpi-label">Stock bajo</span>
                            </div>
                        </div>

                        {/* Lista del día + expediente lateral */}
                        <div className="emp-agenda-layout">
                            <div className="emp-agenda-list">
                                {apptLoading && <p className="emp-empty">Cargando...</p>}
                                {!apptLoading && todayAppts.length === 0 && (
                                    <div className="emp-empty-state">
                                        <FaCalendarAlt />
                                        <p>No hay citas para hoy</p>
                                        <button className="emp-btn-primary sm" onClick={() => setShowCalendar(true)}>
                                            <FaPlusCircle /> Agendar cita
                                        </button>
                                    </div>
                                )}
                                {todayAppts.map(appo => {
                                    const isDone = appo.status === 'Atendido';
                                    const c = getApptColor ? null : null;
                                    const h = hueFromId(appo.petId);
                                    return (
                                        <div key={appo.id}
                                            className={`emp-appt-card ${selectedAppt?.id === appo.id ? 'selected' : ''} ${isDone ? 'atendido' : ''}`}
                                            onClick={() => setSelectedAppt(appo)}
                                            style={{ borderLeft: `4px solid hsl(${h},60%,55%)` }}
                                        >
                                            <div className="emp-appt-time"><FaClock /> {appo.time || '—'}</div>
                                            <div className="emp-appt-info">
                                                <strong>{appo.petName}</strong>
                                                <span>{appo.serviceName}</span>
                                            </div>
                                            <div className="emp-appt-right">
                                                <span className={`emp-status-pill ${isDone ? 'done' : 'pending'}`}>
                                                    {isDone ? <FaCheckCircle /> : <FaClock />} {appo.status}
                                                </span>
                                                <span className="emp-appt-price">${appo.finalPrice}</span>
                                            </div>
                                            <button className="emp-appt-del"
                                                onClick={e => { e.stopPropagation(); handleDeleteAppt(appo.id); }}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Panel expediente */}
                            <aside className="emp-exp-panel">
                                {!selectedAppt ? (
                                    <div className="emp-exp-empty">
                                        <FaClipboardList />
                                        <p>Selecciona una cita para ver el expediente</p>
                                    </div>
                                ) : (
                                    <div className="emp-exp-content fade-in">
                                        <h4 className="emp-exp-title"><FaNotesMedical /> Expediente</h4>
                                        {selectedPet ? (
                                            <>
                                                <div className="emp-exp-pet-info">
                                                    <div className="emp-exp-avatar"
                                                        style={{ background: `hsl(${hueFromId(selectedPet.id)},65%,60%)` }}>
                                                        {selectedPet.petName?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <strong>{selectedPet.petName}</strong>
                                                        <span>{selectedPet.breed || '—'} · {selectedPet.weight} kg</span>
                                                        {selectedOwner && (
                                                            <span className="emp-exp-owner-info">
                                                                {selectedOwner.name} · {selectedOwner.phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {selectedPet.notes && (
                                                    <div className="emp-notes-preview">
                                                        <span className="emp-notes-label">Notas / alergias</span>
                                                        <p>{selectedPet.notes}</p>
                                                    </div>
                                                )}
                                                {selectedPet.history?.length > 0 && (
                                                    <div className="emp-last-visit">
                                                        <span className="emp-notes-label">Última visita</span>
                                                        <p className="emp-last-visit-date">{selectedPet.history[selectedPet.history.length-1].date}</p>
                                                        <p>{selectedPet.history[selectedPet.history.length-1].detail}</p>
                                                    </div>
                                                )}
                                                <div className="emp-exp-actions">
                                                    <button className="emp-btn-secondary" onClick={() => setMedicalPet(selectedPet)}>
                                                        <FaEdit /> Expediente completo
                                                    </button>
                                                    {selectedAppt.status !== 'Atendido' && (
                                                        <button className="emp-btn-done" onClick={() => handleMarkDone(selectedAppt)}>
                                                            <FaCheckCircle /> Marcar atendido
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="emp-empty">Mascota no encontrada</p>
                                        )}
                                    </div>
                                )}
                            </aside>
                        </div>
                    </div>
                )}

                {/* ══ CLIENTES ══ */}
                {tab === 'clientes' && (
                    <div className="fade-in">
                        <div className="emp-page-header"><div><h2>Clientes</h2><p>{clients.length} registrados</p></div></div>
                        <form onSubmit={e => handleSave('client',e)} className="emp-form-card">
                            <h4 className="emp-form-title">{editingId ? 'Editar' : 'Nuevo cliente'}</h4>
                            <div className="emp-form-grid">
                                <input placeholder="Nombre" value={clientForm.name} onChange={e => setClientForm({...clientForm,name:e.target.value})} required />
                                <input placeholder="Teléfono" value={clientForm.phone} onChange={e => setClientForm({...clientForm,phone:e.target.value})} required />
                                <input type="email" placeholder="Email" value={clientForm.email} onChange={e => setClientForm({...clientForm,email:e.target.value})} required />
                            </div>
                            <div className="emp-form-actions">
                                <button type="submit" className="emp-btn-primary sm">{editingId ? 'Actualizar' : 'Guardar'}</button>
                                {editingId && <button type="button" className="emp-btn-ghost sm" onClick={cancelEdit}>Cancelar</button>}
                            </div>
                        </form>
                        <div className="emp-table-card">
                            <table className="emp-table">
                                <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Mascotas</th><th></th></tr></thead>
                                <tbody>
                                    {clients.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                                        <tr key={c.id}>
                                            <td><strong>{c.name}</strong></td><td>{c.phone}</td><td>{c.email}</td>
                                            <td><span className="emp-badge">{pets.filter(p => String(p.ownerId)===String(c.id)).length} mascota(s)</span></td>
                                            <td className="emp-actions-cell">
                                                <button className="emp-btn-icon edit" onClick={() => startEdit('client',c)}><FaEdit /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ PACIENTES ══ */}
                {tab === 'pacientes' && (
                    <div className="fade-in">
                        <div className="emp-page-header"><div><h2>Pacientes</h2><p>{pets.length} mascotas</p></div></div>
                        <form onSubmit={e => handleSave('pet',e)} className="emp-form-card">
                            <h4 className="emp-form-title">{editingId ? 'Editar' : 'Nuevo paciente'}</h4>
                            <div className="emp-form-grid">
                                <input placeholder="Nombre mascota" value={petForm.petName} onChange={e => setPetForm({...petForm,petName:e.target.value})} required />
                                <input placeholder="Raza" value={petForm.breed} onChange={e => setPetForm({...petForm,breed:e.target.value})} />
                                <input type="number" placeholder="Peso (kg)" value={petForm.weight} onChange={e => setPetForm({...petForm,weight:e.target.value})} required />
                                <select value={petForm.ownerId} onChange={e => setPetForm({...petForm,ownerId:e.target.value})} required>
                                    <option value="">Asignar dueño...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <input placeholder="Notas / alergias" value={petForm.notes} onChange={e => setPetForm({...petForm,notes:e.target.value})} className="emp-span2" />
                            </div>
                            <div className="emp-form-actions">
                                <button type="submit" className="emp-btn-primary sm">{editingId ? 'Actualizar' : 'Registrar'}</button>
                                {editingId && <button type="button" className="emp-btn-ghost sm" onClick={cancelEdit}>Cancelar</button>}
                            </div>
                        </form>
                        <div className="emp-pet-grid">
                            {pets.filter(p => p.petName?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                                const owner = clients.find(c => String(c.id)===String(p.ownerId));
                                return (
                                    <div key={p.id} className="emp-pet-card">
                                        <div className="emp-pet-avatar" style={{background:`hsl(${hueFromId(p.id)},65%,60%)`}}>
                                            {p.petName?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="emp-pet-info">
                                            <h5>{p.petName}</h5>
                                            <span>{p.breed||'—'} · {p.weight} kg</span>
                                            <span className="emp-pet-owner">{owner?.name||'Sin dueño'}</span>
                                        </div>
                                        <div className="emp-pet-card-actions">
                                            <button className="emp-btn-icon lavender" onClick={() => setMedicalPet(p)}><FaNotesMedical /></button>
                                            <button className="emp-btn-icon edit" onClick={() => startEdit('pet',p)}><FaEdit /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ══ INVENTARIO ══ */}
                {tab === 'inventario' && (
                    <div className="fade-in">
                        <div className="emp-page-header"><div><h2>Inventario</h2><p>Solo lectura</p></div></div>
                        {kpis.stockBajo > 0 && (
                            <div className="emp-stock-alert">
                                <FaExclamationTriangle />
                                <span>{kpis.stockBajo} producto(s) con stock crítico</span>
                            </div>
                        )}
                        <div className="emp-table-card">
                            <table className="emp-table">
                                <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Stock</th></tr></thead>
                                <tbody>
                                    {products.map(p => (
                                        <tr key={p.id}>
                                            <td><strong>{p.name}</strong></td>
                                            <td><span className="emp-badge">{p.category}</span></td>
                                            <td>${p.price}</td>
                                            <td>
                                                <span className={`emp-stock-pill ${Number(p.stock)<5 ? 'low' : 'ok'}`}>
                                                    {Number(p.stock)<5 && <FaExclamationTriangle />} {p.stock} unid.
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// helper accesible fuera del componente
function getApptColor(appt) {
    if (appt.status === 'Atendido') return { bg:'#e1f5ee', border:'#1D9E75', text:'#085041' };
    const h = hueFromId(appt.petId);
    return { bg:`hsl(${h},70%,94%)`, border:`hsl(${h},60%,55%)`, text:`hsl(${h},55%,30%)` };
}

export default EmployeeDashboard;