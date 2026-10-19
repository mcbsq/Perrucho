// src/components/BookingCalendar/BookingCalendar.jsx
//
// Selector de día + hora para el CLIENTE, con la misma estructura que la
// agenda del empleado/admin (EmployeeDashboard › CalendarModal): barra
// ‹ Hoy ›, vista Semana / Día, columnas por día y filas por hora. A
// diferencia de la agenda interna, aquí no se ven las citas de otros
// clientes — solo los horarios del negocio (GET /api/appointments/
// availability), marcados como libres u ocupados. El cliente elige uno;
// la cita queda "Pendiente" hasta que el negocio la acepte.
//
// Se usa en la reserva con cuenta (ServiceModal) y en la reserva rápida
// (Home › BookingExpressModal).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { appointmentsApi } from '../../api/apiClient';
import './BookingCalendar.css';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(startOfDay(d), -d.getDay()); // domingo, igual que la agenda interna
const hourOf = (t) => Number(t.split(':')[0]);

// 12 h, como lo lee un cliente ("10:15 a. m.").
export const formatTime12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
};

const useIsNarrow = () => {
    const query = '(max-width: 640px)';
    const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = (e) => setNarrow(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return narrow;
};

const BookingCalendar = ({ serviceId = null, employeeId = null, value, onChange }) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const narrow = useIsNarrow();
    // Hora local "HH:mm" — para no ofrecer horas de hoy que ya pasaron
    // aunque el servidor todavía no las marque como llenas.
    const nowHM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const [view, setView] = useState(narrow ? 'day' : 'week');
    const [anchor, setAnchor] = useState(() => (value?.date ? new Date(`${value.date}T12:00:00`) : today));
    // { 'servicio|empleado|YYYY-MM-DD': { slots, fullSlots } | 'loading' | 'error' }
    // — la llave incluye servicio y empleado porque cambian la disponibilidad.
    const [cache, setCache] = useState({});
    const keyOf = (iso) => `${serviceId || ''}|${employeeId || ''}|${iso}`;
    const avail = (iso) => cache[keyOf(iso)];

    useEffect(() => { if (narrow) setView('day'); }, [narrow]);

    const days = useMemo(() => {
        if (view === 'day') return [startOfDay(anchor)];
        const s = startOfWeek(anchor);
        return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }, [view, anchor]);

    useEffect(() => {
        days.forEach((d) => {
            const iso = toISO(d);
            const key = keyOf(iso);
            if (d < today || cache[key]) return;
            setCache((prev) => ({ ...prev, [key]: 'loading' }));
            appointmentsApi.getAvailability(iso, serviceId, employeeId)
                .then((res) => setCache((prev) => ({ ...prev, [key]: { slots: res.slots || [], fullSlots: res.fullSlots || [] } })))
                .catch(() => setCache((prev) => ({ ...prev, [key]: 'error' })));
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days, serviceId, employeeId]);

    // Filas de hora: del primer al último horario de atención de los días visibles.
    const hours = useMemo(() => {
        const all = days.flatMap((d) => {
            const a = avail(toISO(d));
            return a && typeof a === 'object' ? a.slots : [];
        });
        if (all.length === 0) return [];
        const hs = all.map(hourOf);
        const min = Math.min(...hs), max = Math.max(...hs);
        return Array.from({ length: max - min + 1 }, (_, i) => min + i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [days, cache, serviceId, employeeId]);

    const step = view === 'week' ? 7 : 1;
    // Si hoy ya no queda ningún horario libre (p. ej. reservan en la tarde),
    // saltar solo al siguiente día — antes el cliente veía todo tachado y
    // tenía que adivinar que debía avanzar. Una sola vez por montaje.
    const autoAdvanced = useRef(false);
    useEffect(() => {
        if (autoAdvanced.current || value?.date) return;
        const iso = toISO(today);
        const a = avail(iso);
        if (!a || typeof a !== 'object') return;
        autoAdvanced.current = true;
        const free = a.slots.filter((t) => !a.fullSlots.includes(t) && t > nowHM);
        if (free.length === 0 && toISO(anchor) === iso) setAnchor(addDays(today, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cache]);

    const canGoBack = startOfDay(addDays(view === 'week' ? startOfWeek(anchor) : anchor, -1)) >= today;
    const goBack = () => canGoBack && setAnchor((a) => addDays(a, -step));
    const goNext = () => setAnchor((a) => addDays(a, step));
    const goToday = () => setAnchor(today);

    const periodLabel = () => {
        if (view === 'day') {
            const t = anchor.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
            return t.charAt(0).toUpperCase() + t.slice(1);
        }
        const s = days[0], e = days[6];
        return s.getMonth() === e.getMonth()
            ? `${s.getDate()} – ${e.getDate()} de ${MONTHS[e.getMonth()]}`
            : `${s.getDate()} ${MONTHS[s.getMonth()].slice(0, 3)} – ${e.getDate()} ${MONTHS[e.getMonth()].slice(0, 3)}`;
    };

    const anyLoading = days.some((d) => avail(toISO(d)) === 'loading');
    const anyError = days.some((d) => avail(toISO(d)) === 'error');
    const allClosed = !anyLoading && days.every((d) => {
        const a = avail(toISO(d));
        return d < today || (a && typeof a === 'object' && a.slots.length === 0);
    });

    const todayISO = toISO(today);

    const renderSlot = (iso, t, fullSlots) => {
        const isFull = fullSlots.includes(t) || (iso === todayISO && t <= nowHM);
        const isSelected = value?.date === iso && value?.time === t;
        return (
            <button key={t} type="button"
                className={`bkc-slot ${isSelected ? 'is-selected' : ''} ${isFull ? 'is-full' : ''}`}
                disabled={isFull}
                aria-pressed={isSelected}
                aria-label={`${new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}, ${formatTime12(t)}${isFull ? ', no disponible' : ''}`}
                onClick={() => onChange({ date: iso, time: t })}>
                {formatTime12(t)}
            </button>
        );
    };

    return (
        <div className={`bkc bkc--${view}`}>
            <div className="bkc-toolbar">
                <div className="bkc-nav">
                    <button type="button" className="bkc-icon-btn" onClick={goBack} disabled={!canGoBack} aria-label={view === 'week' ? 'Semana anterior' : 'Día anterior'}><FaChevronLeft /></button>
                    <button type="button" className="bkc-today-btn" onClick={goToday}>Hoy</button>
                    <button type="button" className="bkc-icon-btn" onClick={goNext} aria-label={view === 'week' ? 'Semana siguiente' : 'Día siguiente'}><FaChevronRight /></button>
                    <span className="bkc-period" aria-live="polite">{periodLabel()}</span>
                </div>
                {!narrow && (
                    <div className="bkc-segmented" role="group" aria-label="Vista del calendario">
                        {[['week', 'Semana'], ['day', 'Día']].map(([v, label]) => (
                            <button key={v} type="button" className={view === v ? 'is-active' : ''} aria-pressed={view === v} onClick={() => setView(v)}>{label}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* En vista Día, una tira de la semana para saltar rápido (en celular
                es la única vista, así que hace de selector de día). */}
            {view === 'day' && (
                <div className="bkc-daystrip">
                    {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)).map((d) => {
                        const iso = toISO(d);
                        const isPast = d < today;
                        return (
                            <button key={iso} type="button" disabled={isPast}
                                className={`bkc-daystrip-btn ${iso === toISO(anchor) ? 'is-active' : ''} ${iso === toISO(today) ? 'is-today' : ''} ${value?.date === iso ? 'has-selection' : ''}`}
                                onClick={() => setAnchor(d)}>
                                <span>{DAYS_SHORT[d.getDay()]}</span>
                                <strong>{d.getDate()}</strong>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="bkc-grid" style={{ '--bkc-cols': days.length }}>
                <div className="bkc-head">
                    <div className="bkc-gutter" />
                    {days.map((d) => {
                        const iso = toISO(d);
                        const isToday = iso === toISO(today);
                        return (
                            <button key={iso} type="button" className={`bkc-head-day ${isToday ? 'is-today' : ''} ${d < today ? 'is-past' : ''}`}
                                onClick={() => { if (view === 'week' && d >= today) { setAnchor(d); setView('day'); } }}
                                tabIndex={view === 'week' && d >= today ? 0 : -1}>
                                <span className="bkc-head-name">{DAYS_SHORT[d.getDay()]}</span>
                                <span className="bkc-head-num">{d.getDate()}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="bkc-body">
                    {anyLoading && hours.length === 0 && (
                        <div className="bkc-state"><span className="bkc-spinner" /> Consultando horarios…</div>
                    )}
                    {!anyLoading && allClosed && (
                        <div className="bkc-state">
                            {view === 'week' ? 'No hay horarios esta semana.' : 'El negocio no atiende este día.'}
                            <button type="button" className="bkc-link-btn" onClick={goNext}>
                                {view === 'week' ? 'Ver la siguiente semana' : 'Ver el día siguiente'}
                            </button>
                        </div>
                    )}
                    {anyError && <div className="bkc-state bkc-state--error">No pudimos cargar algunos horarios. Revisa tu conexión e intenta de nuevo.</div>}

                    {hours.map((h) => (
                        <div key={h} className="bkc-row">
                            <div className="bkc-hour">{h % 12 || 12}<small>{h >= 12 ? 'pm' : 'am'}</small></div>
                            {days.map((d) => {
                                const iso = toISO(d);
                                const a = avail(iso);
                                const closed = d < today || (a && typeof a === 'object' && a.slots.length === 0);
                                const slots = a && typeof a === 'object' ? a.slots.filter((t) => hourOf(t) === h) : [];
                                return (
                                    <div key={iso} className={`bkc-cell ${closed ? 'is-closed' : ''}`}>
                                        {a === 'loading' && <span className="bkc-skeleton" />}
                                        {slots.map((t) => renderSlot(iso, t, a.fullSlots))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bkc-legend" aria-hidden="true">
                <span><i className="bkc-dot bkc-dot--free" /> Disponible</span>
                <span><i className="bkc-dot bkc-dot--full" /> Ocupado</span>
                <span><i className="bkc-dot bkc-dot--sel" /> Tu elección</span>
            </div>
        </div>
    );
};

export default BookingCalendar;
