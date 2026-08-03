// src/components/shared/NotificationBell.jsx
//
// Centro de notificaciones internas del panel — reutiliza el mismo log de
// los toasts (éxito/info/error) para mostrar un historial de confirmaciones
// de lo que se hizo en el sistema (cita confirmada, venta registrada, stock
// crítico, etc), no solo el mensaje pasajero de 3 segundos.
import React, { useState, useRef, useEffect } from 'react';
import { FaBell, FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import './NotificationBell.css';

const ICONS = { success: FaCheckCircle, error: FaTimesCircle, info: FaInfoCircle, warning: FaExclamationTriangle };

const timeAgo = (date) => {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'Justo ahora';
    if (s < 3600) return `Hace ${Math.floor(s / 60)} min`;
    if (s < 86400) return `Hace ${Math.floor(s / 3600)} h`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

const NotificationBell = ({ log = [], unseenCount = 0, onOpen }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleToggle = () => {
        setOpen(v => !v);
        if (!open) onOpen?.();
    };

    return (
        <div className="nbell-wrap" ref={ref}>
            <button type="button" className="nbell-btn" onClick={handleToggle} aria-label="Notificaciones">
                <FaBell />
                {unseenCount > 0 && <span className="nbell-badge">{unseenCount > 9 ? '9+' : unseenCount}</span>}
            </button>
            {open && (
                <div className="nbell-panel">
                    <div className="nbell-header">Notificaciones</div>
                    {log.length === 0 ? (
                        <p className="nbell-empty">Sin actividad todavía.</p>
                    ) : (
                        <div className="nbell-list">
                            {log.map(item => {
                                const Icon = ICONS[item.type] || FaInfoCircle;
                                return (
                                    <div key={item.id} className={`nbell-item nbell-item--${item.type}`}>
                                        <span className="nbell-item-icon"><Icon /></span>
                                        <div className="nbell-item-body">
                                            <span className="nbell-item-text">{item.message}</span>
                                            <span className="nbell-item-time">{timeAgo(item.at)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
