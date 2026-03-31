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
    FaChevronLeft, FaChevronRight, FaSync
} from 'react-icons/fa';
import './EmployeeDashboard.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const formatDateLong = (str) => {
    if (!str) return '';
    const d = new Date(str + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
};

const HOURS      = Array.from({ length: 12 }, (_, i) => i + 8);
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS     = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
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

const getApptColor = (appt) => {
    if (appt.status === 'Atendido') return { bg: '#e1f5ee', border: '#1D9E75', text: '#085041' };
    const h = hueFromId(appt.petId);
    return { bg: `hsl(${h},70%,94%)`, border: `hsl(${h},60%,55%)`, text: `hsl(${h},55%,30%)` };
};

const calcPrice = (base, w) => {
    const weight = Number(w), p = Number(base);
    if (weight <= 5)  return p;
    if (weight <= 12) return +(p * 1.25).toFixed(2);
    if (weight <= 25) return +(p * 1.50).toFixed(2);
    return +(p * 2).toFixed(2);
};

// ─── Estados iniciales ────────────────────────────────────────────────────────
const INITIAL_CLIENT = { name: '', phone: '', email: '' };
const INITIAL_PET    = { petName: '', breed: '', weight: '', ownerId: '', notes: '', history: [] };
const INITIAL_APPO   = { petId: '', serviceId: '', time: '', date: todayStr(), status: 'Pendiente', finalPrice: 0 };

// ─── Toast ────────────────────────────────────────────────────────────────────
// FIX WARN#1 + BUG#4: feedback visual para errores y éxitos
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div className={`emp-toast emp-toast--${type}`}>
            <span>{message}</span>
            <button onClick={onClose}><FaTimes /></button>
        </div>
    );
};

const useToast = () => {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    return { toasts, addToast, removeToast };
};

// ─── Diálogo de confirmación ──────────────────────────────────────────────────
// FIX BUG#2: confirmación visual antes de eliminar citas
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
    <div className="emp-modal-overlay" onClick={onCancel}>
        <div className="emp-modal-box emp-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="emp-modal-header">
                <h3><FaExclamationTriangle style={{ color: '#ff7675', marginRight: 8 }} />Confirmar</h3>
                <button className="emp-modal-close" onClick={onCancel}><FaTimes /></button>
            </div>
            <div className="emp-modal-body" style={{ gap: 16 }}>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="emp-btn-danger" onClick={onConfirm}>Sí, confirmar</button>
                    <button className="emp-btn-ghost" onClick={onCancel}>Cancelar</button>
                </div>
            </div>
        </div>
    </div>
);

const useConfirm = () => {
    const [dialog, setDialog] = useState(null);
    const confirm = useCallback((message) => new Promise((resolve) => {
        setDialog({ message, resolve });
    }), []);
    const handleResponse = (result) => {
        dialog?.resolve(result);
        setDialog(null);
    };
    const ConfirmNode = dialog ? (
        <ConfirmDialog
            message={dialog.message}
            onConfirm={() => handleResponse(true)}
            onCancel={() => handleResponse(false)}
        />
    ) : null;
    return { confirm, ConfirmNode };
};

// ─── Modal genérico ───────────────────────────────────────────────────────────
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

// ─── Pop-up de cita (anclado al elemento, bottom-sheet en mobile) ─────────────
const ApptPopup = ({ appt, anchorRect, pets, clients, onMarkDone, onOpenExp, onDelete, onClose }) => {
    const popupRef = React.useRef(null);
    const [pos, setPos] = React.useState({ top: 0, left: 0, placement: 'bottom' });

    const pet    = pets.find(p => String(p.id) === String(appt.petId));
    const owner  = pet ? clients.find(c => String(c.id) === String(pet.ownerId)) : null;
    const isDone = appt.status === 'Atendido';
    const color  = getApptColor(appt);

    // Calcular posición óptima relativa al elemento clickeado
    useEffect(() => {
        if (!anchorRect || !popupRef.current) return;
        const W = window.innerWidth;
        const H = window.innerHeight;
        const PW = 300; // ancho del popup
        const PH = popupRef.current.offsetHeight || 340;
        const GAP = 8;

        // En mobile (<600px) bottom-sheet — sin posicionamiento calculado
        if (W < 600) { setPos({ mobile: true }); return; }

        let left = anchorRect.left + anchorRect.width / 2 - PW / 2;
        left = Math.max(12, Math.min(left, W - PW - 12));

        let top, placement;
        // Intentar abajo
        if (anchorRect.bottom + GAP + PH < H) {
            top = anchorRect.bottom + GAP;
            placement = 'bottom';
        } else {
            top = anchorRect.top - GAP - PH;
            placement = 'top';
        }
        top = Math.max(12, top);
        setPos({ top, left, placement, mobile: false });
    }, [anchorRect]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handler = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) onClose();
        };
        // Pequeño delay para que no cierre inmediatamente al abrir
        const t = setTimeout(() => document.addEventListener('mousedown', handler), 80);
        return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
    }, [onClose]);

    // Cerrar con Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const popupStyle = pos.mobile
        ? {} // el CSS se encarga del bottom-sheet
        : { position: 'fixed', top: pos.top, left: pos.left, zIndex: 2000 };

    return (
        <>
            {/* Backdrop ligero — solo en mobile hace overlay completo */}
            <div className="appt-popup-backdrop" onClick={onClose} />
            <div
                ref={popupRef}
                className={`appt-popup ${pos.mobile ? 'appt-popup--mobile' : ''} ${pos.placement === 'top' ? 'appt-popup--above' : ''}`}
                style={popupStyle}
                role="dialog"
                aria-modal="true"
            >
                {/* Indicador de color del servicio */}
                <div className="appt-popup-bar" style={{ background: color.border }} />

                <div className="appt-popup-header">
                    <div className="appt-popup-avatar" style={{ background: `hsl(${hueFromId(appt.petId)},65%,60%)` }}>
                        {pet?.petName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="appt-popup-title">
                        <strong>{pet?.petName || 'Mascota'}</strong>
                        <span>{pet?.breed || '—'} · {pet?.weight} kg</span>
                        {owner && <span className="appt-popup-owner">{owner.name}{owner.phone ? ` · ${owner.phone}` : ''}</span>}
                    </div>
                    <button className="appt-popup-close" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="appt-popup-body">
                    <div className="appt-popup-row">
                        <FaClock className="appt-popup-icon" />
                        <span>{appt.time || '—'} · {formatDateLong(appt.date)}</span>
                    </div>
                    <div className="appt-popup-row">
                        <FaNotesMedical className="appt-popup-icon" />
                        <span>{appt.serviceName || '—'}</span>
                        <strong className="appt-popup-price">${appt.finalPrice || 0}</strong>
                    </div>
                    <div className="appt-popup-row">
                        <span className={`emp-status-pill ${isDone ? 'done' : 'pending'}`} style={{fontSize:'0.7rem'}}>
                            {isDone ? <FaCheckCircle /> : <FaClock />} {appt.status}
                        </span>
                    </div>

                    {pet?.notes && (
                        <div className="appt-popup-notes">
                            <span className="appt-popup-notes-label">Notas / alergias</span>
                            <p>{pet.notes}</p>
                        </div>
                    )}
                    {pet?.history?.length > 0 && (
                        <div className="appt-popup-notes appt-popup-notes--visit">
                            <span className="appt-popup-notes-label">Última visita</span>
                            <p><strong>{pet.history[pet.history.length - 1].date}</strong> — {pet.history[pet.history.length - 1].detail}</p>
                        </div>
                    )}
                </div>

                <div className="appt-popup-actions">
                    {pet && onOpenExp && (
                        <button className="appt-popup-btn appt-popup-btn--secondary"
                            onClick={() => { onOpenExp(pet); onClose(); }}>
                            <FaEdit /> Expediente
                        </button>
                    )}
                    {!isDone && onMarkDone && (
                        <button className="appt-popup-btn appt-popup-btn--done"
                            onClick={() => { onMarkDone(appt); onClose(); }}>
                            <FaCheckCircle /> Atendido
                        </button>
                    )}
                    {onDelete && (
                        <button className="appt-popup-btn appt-popup-btn--del"
                            onClick={() => { onDelete(appt.id); onClose(); }}>
                            <FaTrash />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

// ─── Modal: Calendario ────────────────────────────────────────────────────────
const CalendarModal = ({
    appointments, pets, clients, services,
    onAddAppt, onMarkDone, onDeleteAppt, onOpenExp, onClose
}) => {
    const now = new Date();
    const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
    const [calView,  setCalView]  = useState('week');
    const [dayDate,  setDayDate]  = useState(now);
    const [selAppt,     setSelAppt]     = useState(null);
    const [anchorRect,  setAnchorRect]  = useState(null);
    const [showForm,    setShowForm]    = useState(false);

    // Abre el popup anclado al elemento clickeado
    const openPopup = (appt, e) => {
        e.stopPropagation();
        setAnchorRect(e.currentTarget.getBoundingClientRect());
        setSelAppt(appt);
    };
    const closePopup = () => { setSelAppt(null); setAnchorRect(null); };
    const [saving,   setSaving]   = useState(false);
    const [newAppt,  setNewAppt]  = useState(INITIAL_APPO);

    useEffect(() => {
        if (newAppt.petId && newAppt.serviceId) {
            const pet = pets.find(p => String(p.id) === String(newAppt.petId));
            const svc = services.find(s => String(s.id) === String(newAppt.serviceId));
            if (pet && svc) setNewAppt(prev => ({ ...prev, finalPrice: calcPrice(svc.price, pet.weight) }));
        }
    }, [newAppt.petId, newAppt.serviceId, pets, services]);

    // FIX WARN#1: try/catch con feedback en creación de cita
    const handleCreateAppt = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onAddAppt(newAppt);
            setShowForm(false);
            setNewAppt(INITIAL_APPO);
        } catch (err) {
            console.error(err);
            // El toast se maneja desde el padre a través de onAddAppt
        } finally {
            setSaving(false);
        }
    };

    const apptsByDate = useMemo(() => {
        const map = {};
        appointments.forEach(a => {
            if (!map[a.date]) map[a.date] = [];
            map[a.date].push(a);
        });
        return map;
    }, [appointments]);

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
        setDayDate(new Date(now));
    };

    // FIX BUG#5: al cambiar de vista, sincronizar dayDate con el mes visible en viewDate
    const handleViewChange = (v) => {
        if (v === 'week' || v === 'day') {
            // Si venimos de vista mes, saltar al 1er día del mes que se estaba viendo
            const candidate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
            const isCurrentMonth =
                viewDate.getFullYear() === now.getFullYear() &&
                viewDate.getMonth()    === now.getMonth();
            setDayDate(isCurrentMonth ? new Date(now) : candidate);
        }
        setCalView(v);
    };

    const headerLabel = () => {
        if (calView === 'month') return `${MONTHS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
        if (calView === 'day')   return formatDateLong(dayDate.toISOString().split('T')[0]);
        const start = new Date(dayDate);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start); end.setDate(end.getDate() + 6);
        return `${start.getDate()} — ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
    };

    // ── Vista MES ─────────────────────────────────────────────────────────────
    const MonthView = () => {
        const year  = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const first = new Date(year, month, 1).getDay();
        const days  = new Date(year, month + 1, 0).getDate();
        const cells = Array.from({ length: first + days }, (_, i) => i < first ? null : i - first + 1);
        while (cells.length % 7 !== 0) cells.push(null);

        return (
            <div className="cal-month">
                <div className="cal-month-header">
                    {DAYS_SHORT.map(d => <div key={d} className="cal-month-day-label">{d}</div>)}
                </div>
                <div className="cal-month-grid">
                    {cells.map((day, i) => {
                        if (!day) return <div key={i} className="cal-cell cal-cell--empty" />;
                        const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const dayAppts = apptsByDate[dateStr] || [];
                        const isToday  = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                        return (
                            <div
                                key={i}
                                className={`cal-cell ${isToday ? 'cal-cell--today' : ''}`}
                                onClick={() => { setDayDate(new Date(year, month, day)); handleViewChange('day'); }}
                            >
                                <span className="cal-cell-num">{day}</span>
                                {dayAppts.slice(0, 3).map(a => {
                                    const c = getApptColor(a);
                                    return (
                                        <div
                                            key={a.id}
                                            className="cal-event-chip"
                                            style={{ background: c.bg, borderLeft: `3px solid ${c.border}`, color: c.text }}
                                            onClick={e => openPopup(a, e)}
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

    // ── Vista SEMANA ──────────────────────────────────────────────────────────
    const WeekView = () => {
        const start = new Date(dayDate);
        start.setDate(start.getDate() - start.getDay());
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });

        return (
            <div className="cal-week">
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
                                                        onClick={e => openPopup(a, e)}
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

    // ── Vista DÍA ─────────────────────────────────────────────────────────────
    const DayView = () => {
        const dateStr  = dayDate.toISOString().split('T')[0];
        const dayAppts = (apptsByDate[dateStr] || []).sort((a, b) => parseTime(a.time) - parseTime(b.time));

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
                                        const c     = getApptColor(a);
                                        const pet   = pets.find(p => String(p.id) === String(a.petId));
                                        const owner = pet ? clients.find(cl => String(cl.id) === String(pet.ownerId)) : null;
                                        return (
                                            <div
                                                key={a.id}
                                                className="cal-day-event"
                                                style={{ background: c.bg, borderLeft: `5px solid ${c.border}`, color: c.text }}
                                                onClick={e => openPopup(a, e)}
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

    return (
        <>
            <Modal title="Calendario de citas" onClose={onClose} full>
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
                                // FIX BUG#5: usar handleViewChange en lugar de setCalView directo
                                onClick={() => handleViewChange(v)}
                            >
                                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
                            </button>
                        ))}
                        <button
                            className="emp-btn-primary sm"
                            onClick={() => setShowForm(v => !v)}
                            style={{ marginLeft: 8 }}
                        >
                            <FaPlusCircle /> Nueva cita
                        </button>
                    </div>
                </div>

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
                            <div className="emp-price-preview" style={{ marginBottom: 8 }}>
                                Precio estimado: <strong>${newAppt.finalPrice}</strong>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            {/* FIX WARN#1: botón deshabilitado mientras guarda */}
                            <button type="submit" className="emp-btn-primary sm" disabled={saving}>
                                {saving ? 'Guardando...' : 'Confirmar'}
                            </button>
                            <button type="button" className="emp-btn-ghost sm" onClick={() => setShowForm(false)}>Cancelar</button>
                        </div>
                    </form>
                )}

                <div className="cal-view-container">
                    {calView === 'month' && <MonthView />}
                    {calView === 'week'  && <WeekView />}
                    {calView === 'day'   && <DayView />}
                </div>
            </Modal>

            {selAppt && (
                <ApptPopup
                    appt={selAppt}
                    anchorRect={anchorRect}
                    pets={pets}
                    clients={clients}
                    onMarkDone={async (a) => {
                        await onMarkDone(a);
                        setSelAppt(prev => prev?.id === a.id ? { ...prev, status: 'Atendido' } : prev);
                    }}
                    onOpenExp={(pet) => { onOpenExp(pet); closePopup(); }}
                    onDelete={(id) => { onDeleteAppt(id); closePopup(); }}
                    onClose={closePopup}
                />
            )}
        </>
    );
};

// ─── Modal: Expediente clínico ────────────────────────────────────────────────
const MedicalModal = ({ pet, clients, onSave, onClose }) => {
    const [notes,       setNotes]       = useState(pet.notes || '');
    const [sessionNote, setSessionNote] = useState('');
    const [history,     setHistory]     = useState(pet.history || []);
    const [saving,      setSaving]      = useState(false);
    // FIX WARN#4: rastrear si hay cambios sin guardar
    const [hasUnsaved,  setHasUnsaved]  = useState(false);
    const owner = clients.find(c => String(c.id) === String(pet.ownerId));

    // FIX WARN#4: al agregar una nota, marcar como sin guardar y auto-agregar
    const addEntry = () => {
        if (!sessionNote.trim()) return;
        const newEntry = {
            date:   new Date().toLocaleDateString('es-MX'),
            detail: sessionNote.trim(),
            author: 'Empleado',
        };
        setHistory(prev => [...prev, newEntry]);
        setSessionNote('');
        setHasUnsaved(true);
    };

    const handleNotesChange = (val) => {
        setNotes(val);
        setHasUnsaved(true);
    };

    // FIX BUG#4: try/catch con feedback correcto al guardar expediente
    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave({ ...pet, notes, history });
            setHasUnsaved(false);
            // onSave cierra el modal desde el padre
        } catch (err) {
            console.error(err);
            // El error se maneja en el padre con toast
            setSaving(false);
        }
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

            {/* FIX WARN#4: aviso de cambios sin guardar */}
            {hasUnsaved && (
                <div className="emp-unsaved-warning">
                    <FaExclamationTriangle /> Tienes cambios sin guardar
                </div>
            )}

            <div className="exp-section">
                <label className="exp-label"><FaNotesMedical /> Notas generales / alergias</label>
                <textarea
                    className="exp-textarea"
                    rows={3}
                    value={notes}
                    onChange={e => handleNotesChange(e.target.value)}
                    placeholder="Alergias, condiciones crónicas, indicaciones permanentes..."
                />
            </div>

            <div className="exp-section">
                <label className="exp-label"><FaPlusCircle /> Registrar nota de esta sesión</label>
                <div className="exp-session-row">
                    <textarea
                        className="exp-textarea sm"
                        rows={2}
                        value={sessionNote}
                        onChange={e => setSessionNote(e.target.value)}
                        placeholder="Servicio aplicado, medicamentos, observaciones..."
                    />
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

            {/* FIX BUG#4: botón deshabilitado mientras guarda, con texto de carga */}
            <button className="btn-save-exp" onClick={handleSave} disabled={saving}>
                <FaSave /> {saving ? 'Guardando...' : 'Guardar expediente'}
            </button>
        </Modal>
    );
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const EmployeeDashboard = () => {
    const {
        products, pets, clients, services,
        addClient, updateClient,
        addPet, updatePet, addSale,
    } = useData();
    const { logout, user } = useAuth();

    const { toasts, addToast, removeToast } = useToast();
    const { confirm, ConfirmNode }           = useConfirm();

    const [tab,      setTab]      = useState('agenda');
    // FIX BUG#1: editing tipado con id + type para evitar colisiones entre formularios
    const [editing,  setEditing]  = useState({ id: null, type: null });
    const [searchTerm, setSearchTerm] = useState('');

    // ── Modales ───────────────────────────────────────────────────────────────
    const [showCalendar, setShowCalendar] = useState(false);
    const [medicalPet,   setMedicalPet]   = useState(null);

    // ── Agenda ────────────────────────────────────────────────────────────────
    const [appointments,    setAppointments]    = useState([]);
    const [apptLoading,     setApptLoading]     = useState(false);
    const [selectedAppt,    setSelectedAppt]    = useState(null);
    const [agendaAnchorRect,setAgendaAnchorRect]= useState(null);

    const loadAppointments = useCallback(async () => {
        setApptLoading(true);
        try {
            setAppointments(await appointmentsApi.getAll());
        } catch (e) {
            console.error(e);
            addToast('Error al cargar citas', 'error');
        } finally {
            setApptLoading(false);
        }
    }, [addToast]);

    useEffect(() => { loadAppointments(); }, [loadAppointments]);

    const todayAppts = useMemo(() =>
        appointments
            .filter(a => a.date === todayStr())
            .sort((a, b) => (a.time || '').localeCompare(b.time || '')),
        [appointments]
    );

    const kpis = useMemo(() => ({
        total:      todayAppts.length,
        atendidas:  todayAppts.filter(a => a.status === 'Atendido').length,
        pendientes: todayAppts.filter(a => a.status !== 'Atendido').length,
        stockBajo:  products.filter(p => Number(p.stock) < 5).length,
    }), [todayAppts, products]);

    // ── Handlers de citas ─────────────────────────────────────────────────────

    // FIX WARN#1: handleAddAppt con try/catch y toast
    const handleAddAppt = async (form) => {
        const pet = pets.find(p => String(p.id) === String(form.petId));
        const svc = services.find(s => String(s.id) === String(form.serviceId));
        try {
            const created = await appointmentsApi.create({
                ...form,
                petName:     pet?.petName,
                serviceName: svc?.title,
            });
            setAppointments(prev => [...prev, created]);
            addToast('Cita agendada', 'success');
        } catch (e) {
            console.error(e);
            addToast('Error al crear la cita', 'error');
            throw e; // re-lanzar para que CalendarModal no cierre el form
        }
    };

    // FIX BUG#3: handleMarkDone ahora registra venta e historial clínico
    // FIX BUG#2 (parcial): pide confirmación antes de marcar atendido
    const handleMarkDone = async (appo) => {
        const ok = await confirm(
            `¿Marcar como atendida la cita de ${appo.petName} — ${appo.serviceName} ($${appo.finalPrice})?`
        );
        if (!ok) return;
        try {
            // 1. Actualizar estado en API
            const updated = await appointmentsApi.update(appo.id, { status: 'Atendido' });
            setAppointments(prev => prev.map(a =>
                a.id === appo.id ? { ...a, ...updated } : a
            ));
            setSelectedAppt(prev =>
                prev?.id === appo.id ? { ...prev, status: 'Atendido' } : prev
            );

            // 2. FIX BUG#3: registrar la venta con el clientId del dueño
            const pet = pets.find(p => String(p.id) === String(appo.petId));
            const ownerClientId = pet?.ownerId || null;
            await addSale(
                `Servicio: ${appo.serviceName} (${appo.petName})`,
                Number(appo.finalPrice),
                ownerClientId
            );

            // 3. FIX BUG#3: actualizar historial clínico de la mascota
            if (pet) {
                await updatePet(pet.id, {
                    ...pet,
                    history: [...(pet.history || []), {
                        date:   new Date().toLocaleDateString('es-MX'),
                        detail: `${appo.serviceName} completado — $${appo.finalPrice}`,
                        author: user?.name || 'Empleado',
                    }],
                });
            }

            addToast('Cita marcada como atendida y venta registrada', 'success');
        } catch (e) {
            console.error(e);
            addToast('Error al actualizar la cita', 'error');
        }
    };

    // FIX BUG#2: handleDeleteAppt con confirmación
    const handleDeleteAppt = async (id) => {
        const appo = appointments.find(a => a.id === id);
        const ok   = await confirm(
            `¿Eliminar la cita de ${appo?.petName || 'esta mascota'}? Esta acción no se puede deshacer.`
        );
        if (!ok) return;
        try {
            await appointmentsApi.delete(id);
            addToast('Cita eliminada', 'info');
        } catch (e) {
            console.error(e);
        }
        setAppointments(prev => prev.filter(a => a.id !== id));
        if (selectedAppt?.id === id) setSelectedAppt(null);
    };

    // FIX BUG#4: saveMedicalFile con try/catch y toast
    const saveMedicalFile = async (updatedPet) => {
        try {
            await updatePet(updatedPet.id, updatedPet);
            setMedicalPet(null);
            addToast('Expediente guardado', 'success');
        } catch (e) {
            console.error(e);
            addToast('Error al guardar el expediente', 'error');
            throw e; // re-lanzar para que MedicalModal no cierre
        }
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const [clientForm, setClientForm] = useState(INITIAL_CLIENT);
    const [petForm,    setPetForm]    = useState(INITIAL_PET);

    // FIX BUG#1: handleSave usa editing.type para determinar qué actualizar
    const handleSave = async (type, e) => {
        e.preventDefault();
        try {
            if (type === 'client') {
                editing.id ? await updateClient(editing.id, clientForm) : await addClient(clientForm);
            }
            if (type === 'pet') {
                editing.id ? await updatePet(editing.id, petForm) : await addPet(petForm);
            }
            addToast(editing.id ? 'Registro actualizado' : 'Registro guardado', 'success');
            cancelEdit();
        } catch (e) {
            console.error(e);
            addToast('Error al guardar', 'error');
        }
    };

    // FIX BUG#1: startEdit guarda type junto a id
    const startEdit = (type, item) => {
        setEditing({ id: item.id, type });
        if (type === 'client') setClientForm(item);
        if (type === 'pet')    setPetForm(item);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditing({ id: null, type: null });
        setClientForm(INITIAL_CLIENT);
        setPetForm(INITIAL_PET);
    };

    // FIX BUG#1: helper para saber si el formulario actual es el que está en edición
    const isEditing = (type) => editing.type === type && editing.id !== null;

    // ── Datos del expediente lateral ──────────────────────────────────────────
    const selectedPet   = selectedAppt ? pets.find(p => String(p.id) === String(selectedAppt.petId)) : null;
    const selectedOwner = selectedPet  ? clients.find(c => String(c.id) === String(selectedPet.ownerId)) : null;

    // ── Filtros de búsqueda por sección ───────────────────────────────────────
    // FIX WARN#2: filtros aplicados a todas las secciones
    const filteredClients  = clients.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredPets = pets.filter(p =>
        p.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.breed?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const searchPlaceholder = {
        agenda:     '',
        clientes:   'Buscar cliente...',
        pacientes:  'Buscar mascota...',
        inventario: 'Buscar producto...',
    };

    const NAV = [
        { id: 'agenda',     icon: <FaCalendarAlt />, label: 'Agenda'     },
        { id: 'clientes',   icon: <FaUsers />,        label: 'Clientes'   },
        { id: 'pacientes',  icon: <FaPaw />,          label: 'Pacientes'  },
        { id: 'inventario', icon: <FaBoxOpen />,      label: 'Inventario' },
    ];

    return (
        <div className="emp-layout">

            {/* ── TOASTS ── */}
            <div className="emp-toast-container">
                {toasts.map(t => (
                    <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
                ))}
            </div>

            {/* ── CONFIRMACIÓN ── */}
            {ConfirmNode}

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
                    {/* Buscador contextual — oculto en agenda */}
                    {tab !== 'agenda' && (
                        <div className="emp-search-bar">
                            <input
                                type="text"
                                placeholder={searchPlaceholder[tab] || 'Buscar...'}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')}><FaTimes /></button>
                            )}
                        </div>
                    )}
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
                            onClick={() => { setTab(item.id); setSearchTerm(''); cancelEdit(); }}
                            title={item.label}>
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
                            <div style={{ display: 'flex', gap: 8 }}>
                                {/* FIX MEJORA#3: refresh manual */}
                                <button
                                    className="emp-btn-secondary"
                                    style={{ width: 'auto', padding: '8px 14px' }}
                                    onClick={loadAppointments}
                                    title="Actualizar citas"
                                >
                                    <FaSync />
                                </button>
                                <button className="emp-btn-primary" onClick={() => setShowCalendar(true)}>
                                    <FaCalendarAlt /> Ver calendario
                                </button>
                            </div>
                        </div>

                        {/* KPIs */}
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
                            {/* FIX MEJORA#2: KPI stock bajo clickable abre inventario */}
                            <div
                                className="emp-kpi emp-kpi--red emp-kpi--clickable"
                                onClick={() => setTab('inventario')}
                                title="Ver inventario"
                            >
                                <span className="emp-kpi-num">{kpis.stockBajo}</span>
                                <span className="emp-kpi-label">Stock bajo</span>
                                <span className="emp-kpi-hint">Ver inventario →</span>
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
                                    const h      = hueFromId(appo.petId);
                                    return (
                                        <div key={appo.id}
                                            className={`emp-appt-card ${selectedAppt?.id === appo.id ? 'selected' : ''} ${isDone ? 'atendido' : ''}`}
                                            onClick={e => {
                                                if (selectedAppt?.id === appo.id) {
                                                    setSelectedAppt(null); setAgendaAnchorRect(null);
                                                } else {
                                                    setAgendaAnchorRect(e.currentTarget.getBoundingClientRect());
                                                    setSelectedAppt(appo);
                                                }
                                            }}
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

                            {/* Panel expediente lateral — sigue visible como referencia rápida */}
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
                                                    <button className="emp-btn-secondary"
                                                        onClick={() => setMedicalPet(selectedPet)}>
                                                        <FaEdit /> Expediente completo
                                                    </button>
                                                    {selectedAppt.status !== 'Atendido' && (
                                                        <button className="emp-btn-done"
                                                            onClick={() => handleMarkDone(selectedAppt)}>
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

                        {/* Pop-up anclado a la tarjeta de cita seleccionada */}
                        {selectedAppt && agendaAnchorRect && (
                            <ApptPopup
                                appt={selectedAppt}
                                anchorRect={agendaAnchorRect}
                                pets={pets}
                                clients={clients}
                                onMarkDone={async (a) => {
                                    await handleMarkDone(a);
                                    setSelectedAppt(prev => prev?.id === a.id ? { ...prev, status:'Atendido' } : prev);
                                }}
                                onOpenExp={(pet) => { setMedicalPet(pet); setSelectedAppt(null); setAgendaAnchorRect(null); }}
                                onDelete={(id) => { handleDeleteAppt(id); setSelectedAppt(null); setAgendaAnchorRect(null); }}
                                onClose={() => { setSelectedAppt(null); setAgendaAnchorRect(null); }}
                            />
                        )}
                    </div>
                )}

                {/* ══ CLIENTES ══ */}
                {tab === 'clientes' && (
                    <div className="fade-in">
                        <div className="emp-page-header">
                            <div><h2>Clientes</h2><p>{clients.length} registrados</p></div>
                        </div>
                        <form onSubmit={e => handleSave('client', e)} className="emp-form-card">
                            {/* FIX BUG#1: título refleja el tipo correcto */}
                            <h4 className="emp-form-title">{isEditing('client') ? 'Editar cliente' : 'Nuevo cliente'}</h4>
                            <div className="emp-form-grid">
                                <input placeholder="Nombre" value={clientForm.name}
                                    onChange={e => setClientForm({...clientForm, name: e.target.value})} required />
                                <input placeholder="Teléfono" value={clientForm.phone}
                                    onChange={e => setClientForm({...clientForm, phone: e.target.value})} required />
                                <input type="email" placeholder="Email" value={clientForm.email}
                                    onChange={e => setClientForm({...clientForm, email: e.target.value})} required />
                            </div>
                            <div className="emp-form-actions">
                                <button type="submit" className="emp-btn-primary sm">
                                    {isEditing('client') ? 'Actualizar' : 'Guardar'}
                                </button>
                                {isEditing('client') && (
                                    <button type="button" className="emp-btn-ghost sm" onClick={cancelEdit}>Cancelar</button>
                                )}
                            </div>
                        </form>
                        <div className="emp-table-card">
                            <table className="emp-table">
                                <thead><tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Mascotas</th><th></th></tr></thead>
                                <tbody>
                                    {filteredClients.length === 0
                                        ? <tr><td colSpan="5" className="emp-empty-td">Sin resultados</td></tr>
                                        : filteredClients.map(c => (
                                            <tr key={c.id}>
                                                <td><strong>{c.name}</strong></td>
                                                <td>{c.phone}</td>
                                                <td>{c.email}</td>
                                                <td>
                                                    <span className="emp-badge">
                                                        {pets.filter(p => String(p.ownerId) === String(c.id)).length} mascota(s)
                                                    </span>
                                                </td>
                                                <td className="emp-actions-cell">
                                                    <button className="emp-btn-icon edit" onClick={() => startEdit('client', c)}>
                                                        <FaEdit />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ PACIENTES ══ */}
                {tab === 'pacientes' && (
                    <div className="fade-in">
                        <div className="emp-page-header">
                            <div><h2>Pacientes</h2><p>{pets.length} mascotas</p></div>
                        </div>
                        <form onSubmit={e => handleSave('pet', e)} className="emp-form-card">
                            {/* FIX BUG#1: título refleja el tipo correcto */}
                            <h4 className="emp-form-title">{isEditing('pet') ? 'Editar paciente' : 'Nuevo paciente'}</h4>
                            <div className="emp-form-grid">
                                <input placeholder="Nombre mascota" value={petForm.petName}
                                    onChange={e => setPetForm({...petForm, petName: e.target.value})} required />
                                <input placeholder="Raza" value={petForm.breed}
                                    onChange={e => setPetForm({...petForm, breed: e.target.value})} />
                                <input type="number" placeholder="Peso (kg)" value={petForm.weight}
                                    onChange={e => setPetForm({...petForm, weight: e.target.value})} required />
                                <select value={petForm.ownerId}
                                    onChange={e => setPetForm({...petForm, ownerId: e.target.value})} required>
                                    <option value="">Asignar dueño...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <input placeholder="Notas / alergias" value={petForm.notes}
                                    onChange={e => setPetForm({...petForm, notes: e.target.value})}
                                    className="emp-span2" />
                            </div>
                            <div className="emp-form-actions">
                                <button type="submit" className="emp-btn-primary sm">
                                    {isEditing('pet') ? 'Actualizar' : 'Registrar'}
                                </button>
                                {isEditing('pet') && (
                                    <button type="button" className="emp-btn-ghost sm" onClick={cancelEdit}>Cancelar</button>
                                )}
                            </div>
                        </form>
                        <div className="emp-pet-grid">
                            {filteredPets.length === 0 && (
                                <p className="emp-empty-td">Sin resultados</p>
                            )}
                            {filteredPets.map(p => {
                                const owner = clients.find(c => String(c.id) === String(p.ownerId));
                                return (
                                    <div key={p.id} className="emp-pet-card">
                                        <div className="emp-pet-avatar" style={{ background: `hsl(${hueFromId(p.id)},65%,60%)` }}>
                                            {p.petName?.[0]?.toUpperCase()}
                                        </div>
                                        <div className="emp-pet-info">
                                            <h5>{p.petName}</h5>
                                            <span>{p.breed || '—'} · {p.weight} kg</span>
                                            <span className="emp-pet-owner">{owner?.name || 'Sin dueño'}</span>
                                        </div>
                                        <div className="emp-pet-card-actions">
                                            <button className="emp-btn-icon lavender" onClick={() => setMedicalPet(p)}>
                                                <FaNotesMedical />
                                            </button>
                                            <button className="emp-btn-icon edit" onClick={() => startEdit('pet', p)}>
                                                <FaEdit />
                                            </button>
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
                        <div className="emp-page-header">
                            <div><h2>Inventario</h2><p>Solo lectura</p></div>
                        </div>
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
                                    {/* FIX WARN#2: filtrado por searchTerm */}
                                    {filteredProducts.length === 0
                                        ? <tr><td colSpan="4" className="emp-empty-td">Sin resultados</td></tr>
                                        : filteredProducts.map(p => (
                                            <tr key={p.id}>
                                                <td><strong>{p.name}</strong></td>
                                                <td><span className="emp-badge">{p.category}</span></td>
                                                <td>${p.price}</td>
                                                <td>
                                                    <span className={`emp-stock-pill ${Number(p.stock) < 5 ? 'low' : 'ok'}`}>
                                                        {Number(p.stock) < 5 && <FaExclamationTriangle />} {p.stock} unid.
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default EmployeeDashboard;