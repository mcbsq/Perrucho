// src/components/shared/PendingSales.jsx
//
// Por cobrar: seguimiento de las ventas registradas como "Pendiente".
// Feedback real de Taylor's: una venta pendiente guardaba el método de pago
// que estuviera seleccionado por default, y no había dónde ver qué se debía
// ni a quién recordarle. Aquí se ve cuánto y desde cuándo se debe, se manda
// recordatorio por WhatsApp/correo (queda anotado) y se registra el pago con
// su método real cuando el cliente paga.
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaWhatsapp, FaEnvelope, FaReceipt, FaCheckCircle, FaMoneyBillWave, FaCreditCard, FaUniversity } from 'react-icons/fa';
import { DSModal } from './DashboardShared';
import { formatMoney } from '../../utils/ticketPdf';
import { shopToClientPaymentReminder, openWhatsApp } from '../../utils/whatsappNotify';
import './PendingSales.css';

const DAY = 86400000;
const daysSince = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / DAY)) : null);
const agoLabel = (days) => (days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`);
const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

export const PAYMENT_OPTIONS = [
    { value: 'efectivo', label: 'Efectivo', icon: <FaMoneyBillWave /> },
    { value: 'tarjeta', label: 'Tarjeta', icon: <FaCreditCard /> },
    { value: 'transferencia', label: 'Transferencia', icon: <FaUniversity /> },
];

const conceptOf = (sale) => {
    const items = (sale.items || []).filter(i => Number(i.price) >= 0);
    if (!items.length) return 'Venta';
    return items.length > 1 ? `${items[0].name} y ${items.length - 1} más` : items[0].name;
};

export const pendingSalesOf = (sales) => (sales || []).filter(s => s.status === 'pendiente');

// Pop-up para cobrar: el método se elige aquí, cuando de verdad se paga.
const PaySheet = ({ sale, clientName, onConfirm, onClose }) => {
    const [method, setMethod] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const confirm = async () => {
        if (!method) { setError('Elige cómo pagó el cliente.'); return; }
        setSaving(true); setError('');
        try { await onConfirm(method); }
        catch (err) { setError(err.message || 'No se pudo registrar el pago.'); setSaving(false); }
    };
    // Portal a body: la pestaña vive dentro de .fade-in (animación con
    // transform), que encierra a los position:fixed y dejaba el fondo oscuro
    // del pop-up cubriendo solo el área de contenido.
    return createPortal(
        <DSModal title="Registrar pago" onClose={onClose}>
            <div className="ps-pay">
                <div className="ps-pay-amount">
                    <span>{clientName} · Folio #{sale.id}</span>
                    <strong>{formatMoney(sale.total)}</strong>
                    <small>{conceptOf(sale)}</small>
                </div>
                <div className="ps-pay-label" id="ps-pay-method">¿Cómo pagó?</div>
                <div className="ps-pay-methods" role="radiogroup" aria-labelledby="ps-pay-method">
                    {PAYMENT_OPTIONS.map(o => (
                        <button key={o.value} type="button" role="radio" aria-checked={method === o.value}
                            className={`ps-method ${method === o.value ? 'is-active' : ''}`}
                            onClick={() => { setMethod(o.value); setError(''); }}>
                            {o.icon}<span>{o.label}</span>
                        </button>
                    ))}
                </div>
                {error && <p className="ps-error" role="alert">{error}</p>}
                <div className="ps-pay-actions">
                    <button type="button" className="ds-btn ds-btn--secondary" onClick={onClose}>Cancelar</button>
                    <button type="button" className="ps-btn-primary" onClick={confirm} disabled={saving}>
                        <FaCheckCircle aria-hidden="true" /> {saving ? 'Registrando…' : 'Registrar pago'}
                    </button>
                </div>
            </div>
        </DSModal>,
        document.body
    );
};

export const PendingSalesPanel = ({ sales, clients, settings, onPay, onRemind, onShowReceipt, onToast }) => {
    const [filter, setFilter] = useState('all');
    const [paying, setPaying] = useState(null);
    const byId = useMemo(() => new Map((clients || []).map(c => [String(c.id), c])), [clients]);
    const clientOf = (s) => byId.get(String(s.clientId)) || s.client || null;

    const pending = useMemo(
        () => pendingSalesOf(sales).sort((a, b) => new Date(a.date) - new Date(b.date)),
        [sales]
    );
    const visible = pending.filter(s => {
        if (filter === 'old') return daysSince(s.date) >= 7;
        if (filter === 'noReminder') return !s.lastReminderAt;
        return true;
    });
    const total = pending.reduce((a, s) => a + Number(s.total || 0), 0);
    const oldest = pending[0] ? daysSince(pending[0].date) : null;

    const remind = async (sale, channel) => {
        const c = clientOf(sale);
        const name = c?.name?.split(' ')[0] || 'cliente';
        const shopName = settings?.businessName || 'nuestro negocio';
        const amount = formatMoney(sale.total);
        if (channel === 'whatsapp') {
            const url = shopToClientPaymentReminder({ clientName: name, clientPhone: c?.phone, amount, concept: conceptOf(sale), date: fmtDate(sale.date), shopName });
            if (!openWhatsApp(url)) { onToast?.('El teléfono del cliente no es válido para WhatsApp', 'error'); return; }
        } else {
            const subject = `Recordatorio de pago — ${shopName}`;
            const body = `Hola ${name},\n\nTe recordamos que tienes un pago pendiente de ${amount} por ${conceptOf(sale)} (del ${fmtDate(sale.date)}).\n\nPuedes pagarlo en efectivo, tarjeta o transferencia. Si ya lo hiciste, avísanos y lo registramos.\n\n¡Gracias!\n— ${shopName}`;
            window.location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        try { await onRemind(sale); }
        catch (err) { onToast?.(`No se pudo anotar el recordatorio: ${err.message}`, 'error'); }
    };

    const FILTERS = [
        { id: 'all', label: 'Todas', count: pending.length },
        { id: 'old', label: 'Más de 7 días', count: pending.filter(s => daysSince(s.date) >= 7).length },
        { id: 'noReminder', label: 'Sin recordatorio', count: pending.filter(s => !s.lastReminderAt).length },
    ];

    return (
        <div className="ps">
            <div className="ps-summary">
                <div className="ps-summary-main">
                    <span>Total por cobrar</span>
                    <strong>{formatMoney(total)}</strong>
                </div>
                <div className="ps-summary-facts">
                    <span><b>{pending.length}</b> venta{pending.length === 1 ? '' : 's'} pendiente{pending.length === 1 ? '' : 's'}</span>
                    {oldest !== null && <span>La más antigua: <b>{agoLabel(oldest)}</b></span>}
                </div>
            </div>

            {pending.length > 0 && (
                <div className="ps-filters" role="tablist" aria-label="Filtrar ventas pendientes">
                    {FILTERS.map(f => (
                        <button key={f.id} type="button" role="tab" aria-selected={filter === f.id}
                            className={`ps-filter ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
                            {f.label} <span>{f.count}</span>
                        </button>
                    ))}
                </div>
            )}

            {pending.length === 0 ? (
                <div className="ps-empty">
                    <FaCheckCircle aria-hidden="true" />
                    <div>
                        <strong>Nada por cobrar</strong>
                        <p>Cuando registres una venta como <em>Pendiente</em> en el punto de venta, aparece aquí para darle seguimiento hasta que se pague.</p>
                    </div>
                </div>
            ) : visible.length === 0 ? (
                <div className="ps-empty ps-empty--soft"><p>Ninguna venta en este filtro.</p></div>
            ) : (
                <ul className="ps-list">
                    {visible.map(s => {
                        const c = clientOf(s);
                        const age = daysSince(s.date);
                        const reminded = daysSince(s.lastReminderAt);
                        const tone = age >= 30 ? 'late' : age >= 7 ? 'warn' : 'ok';
                        return (
                            <li key={s.id} className={`ps-row ps-row--${tone}`}>
                                <div className="ps-who">
                                    <strong>{c?.name || 'Sin cliente'}</strong>
                                    <span>{c?.phone || c?.email || 'Sin datos de contacto'}</span>
                                </div>
                                <div className="ps-what">
                                    <span className="ps-concept">{conceptOf(s)}</span>
                                    <span className="ps-meta">Folio #{s.id} · {fmtDate(s.date)} · <b className="ps-age">{agoLabel(age)}</b></span>
                                </div>
                                <div className="ps-reminder">
                                    {reminded === null
                                        ? <span className="ps-muted">Sin recordatorio</span>
                                        : <span>Recordado {agoLabel(reminded)}{s.reminderCount > 1 ? ` · ${s.reminderCount} veces` : ''}</span>}
                                </div>
                                <div className="ps-amount">{formatMoney(s.total)}</div>
                                <div className="ps-actions">
                                    {c?.phone && <button type="button" className="ps-icon" onClick={() => remind(s, 'whatsapp')} aria-label={`Recordar por WhatsApp a ${c.name}`} title="Recordar por WhatsApp"><FaWhatsapp /></button>}
                                    {c?.email && <button type="button" className="ps-icon" onClick={() => remind(s, 'email')} aria-label={`Recordar por correo a ${c.name}`} title="Recordar por correo"><FaEnvelope /></button>}
                                    <button type="button" className="ps-icon" onClick={() => onShowReceipt(s)} aria-label={`Ver nota de venta #${s.id}`} title="Ver nota"><FaReceipt /></button>
                                    <button type="button" className="ps-btn-primary ps-btn-sm" onClick={() => setPaying(s)}>Cobrar</button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {paying && (
                <PaySheet sale={paying} clientName={clientOf(paying)?.name || 'Cliente mostrador'}
                    onClose={() => setPaying(null)}
                    onConfirm={async (method) => {
                        const saved = await onPay(paying, method);
                        setPaying(null);
                        onShowReceipt(saved);
                    }} />
            )}
        </div>
    );
};

export default PendingSalesPanel;
