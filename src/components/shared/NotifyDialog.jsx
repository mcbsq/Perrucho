// src/components/shared/NotifyDialog.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Pop-up custom reutilizable que reemplaza window.confirm/alert con un diseño
// coherente con el resto de la app. Soporta:
//   - Tipo 'confirm'  → dos botones (cancelar / confirmar)
//   - Tipo 'info'     → un botón (entendido)
//   - Tipo 'success'  → un botón (cerrar)
//   - Tipo 'error'    → un botón (entendido)
//
// Uso con el hook `useNotify`:
//
//   const { notify, NotifyNode } = useNotify();
//
//   // En el JSX al final del componente:
//   {NotifyNode}
//
//   // Para preguntar:
//   const ok = await notify({
//       type: 'confirm',
//       icon: '📧',
//       title: '¿Avisar al cliente?',
//       message: `¿Quieres enviar un email a ${name}?`,
//       confirmLabel: 'Sí, enviar',
//       cancelLabel:  'No, gracias',
//   });
//   if (ok) { ... }
//
//   // Para informar:
//   await notify({ type: 'info', title: 'Listo', message: 'Cita guardada' });
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import './NotifyDialog.css';

const TYPE_DEFAULTS = {
    confirm: { icon: '❓', accent: 'blue' },
    info:    { icon: 'ℹ️', accent: 'blue' },
    success: { icon: '✅', accent: 'mint' },
    error:   { icon: '⚠️', accent: 'red'  },
};

export const NotifyDialog = ({
    type = 'confirm',
    icon,
    title,
    message,
    confirmLabel = 'Aceptar',
    cancelLabel  = 'Cancelar',
    accent,
    onConfirm,
    onCancel,
}) => {
    const defs = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.confirm;
    const finalIcon   = icon   || defs.icon;
    const finalAccent = accent || defs.accent;

    // Cerrar con Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onCancel?.();
            if (e.key === 'Enter')  onConfirm?.();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onConfirm, onCancel]);

    return (
        <div className="ndlg-overlay" onClick={onCancel}>
            <div
                className={`ndlg-box ndlg-box--${finalAccent}`}
                onClick={e => e.stopPropagation()}
            >
                <button className="ndlg-close" onClick={onCancel} aria-label="Cerrar">
                    <FaTimes />
                </button>

                <div className="ndlg-icon">{finalIcon}</div>

                {title && <h3 className="ndlg-title">{title}</h3>}

                {message && (
                    <p className="ndlg-message">
                        {typeof message === 'string'
                            ? message.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}{i < message.split('\n').length - 1 && <br />}
                                </React.Fragment>
                              ))
                            : message}
                    </p>
                )}

                <div className="ndlg-actions">
                    {type === 'confirm' && (
                        <button
                            type="button"
                            className="ndlg-btn ndlg-btn--secondary"
                            onClick={onCancel}
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        type="button"
                        className={`ndlg-btn ndlg-btn--primary ndlg-btn--${finalAccent}`}
                        onClick={onConfirm}
                        autoFocus
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Hook para usar el dialog desde cualquier componente ───────────────────
export const useNotify = () => {
    const [dialog, setDialog] = useState(null);

    const notify = useCallback((options) => {
        return new Promise((resolve) => {
            setDialog({
                ...options,
                onConfirm: () => { resolve(true);  setDialog(null); },
                onCancel:  () => { resolve(false); setDialog(null); },
            });
        });
    }, []);

    const NotifyNode = dialog ? <NotifyDialog {...dialog} /> : null;

    return { notify, NotifyNode };
};

export default NotifyDialog;