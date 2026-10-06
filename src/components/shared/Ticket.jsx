// src/components/shared/Ticket.jsx
//
// Vista previa del ticket (HTML) y la nota de venta que se abre al cobrar.
// La vista previa usa el mismo modelo que el PDF (buildTicketModel), así lo
// que el negocio ve en pantalla es lo que sale en la impresora térmica.
import React, { useState } from 'react';
import { FaPrint, FaFilePdf, FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { DSModal } from './DashboardShared';
import { buildTicketModel, formatMoney, printTicket, downloadTicket } from '../../utils/ticketPdf';
import './Ticket.css';

export const TicketPreview = ({ sale, settings, branch, client, cashierName }) => {
    const m = buildTicketModel({ sale, settings, branch, client, cashierName });
    return (
        <div className={`tk-paper tk-paper--${m.config.paperWidth === 58 ? 58 : 80} tk-font--${m.config.fontSize}`} aria-label="Vista previa del ticket">
            {m.logoUrl && <img src={m.logoUrl} alt="" className="tk-logo" />}
            <div className="tk-title">{m.title}</div>
            {m.headerLines.map((l, i) => <div key={i} className="tk-center tk-small">{l}</div>)}
            {m.branchName && <div className="tk-center tk-bold">{m.branchName}</div>}
            {m.address && <div className="tk-center tk-small">{m.address}</div>}
            {m.phone && <div className="tk-center tk-small">Tel. {m.phone}</div>}
            <hr />
            {(m.folio || m.dateText) && <div className="tk-pair"><span>{m.folio}</span><span>{m.dateText}</span></div>}
            {m.clientName && <div>Cliente: {m.clientName}</div>}
            {m.cashierName && <div>Atendió: {m.cashierName}</div>}
            <hr />
            {m.charges.map((it, i) => (
                <div key={i} className="tk-item">
                    <div className="tk-bold">{it.name}</div>
                    <div className="tk-pair"><span>{it.quantity} x {formatMoney(it.price)}</span><span>{formatMoney(it.price * it.quantity)}</span></div>
                </div>
            ))}
            <hr />
            {m.discounts.length > 0 && <>
                <div className="tk-pair"><span>Subtotal</span><span>{formatMoney(m.subtotal)}</span></div>
                {m.discounts.map((d, i) => <div key={i} className="tk-pair"><span>{d.name}</span><span>-{formatMoney(Math.abs(d.price * d.quantity))}</span></div>)}
            </>}
            <div className="tk-pair tk-total"><span>TOTAL</span><span>{formatMoney(m.total)}</span></div>
            {m.payment && <div>Pago: {m.payment}</div>}
            {m.status && <div className="tk-bold">{m.status.toUpperCase()}</div>}
            {(m.footer || m.legal) && <hr />}
            {m.footer && <div className="tk-center tk-bold">{m.footer}</div>}
            {m.legal && <div className="tk-center tk-legal">{m.legal}</div>}
        </div>
    );
};

const saleLines = (items) => items
    .map(i => `• ${i.quantity}x ${i.name} — ${formatMoney(i.price * i.quantity)}`).join('\n');

// Nota de venta: vista previa + imprimir en térmica, descargar PDF, o
// mandarla por WhatsApp/correo desde la cuenta de quien cobra.
export const ReceiptModal = ({ sale, settings, client, branch, cashierName, onClose }) => {
    const [busy, setBusy] = useState('');
    const m = buildTicketModel({ sale, settings, branch, client, cashierName });
    const items = [...m.charges, ...m.discounts];
    const phone = (client?.phone || sale.client?.phone || '').replace(/\D/g, '');
    const email = client?.email || sale.client?.email;
    const args = { sale, settings, branch, client, cashierName };

    const run = async (key, fn) => {
        setBusy(key);
        try { await fn(); } finally { setBusy(''); }
    };

    const handleWhatsApp = () => {
        const msg = `*Nota de venta — ${m.title}*\n${m.folio}\n\n${saleLines(items)}\n\n*Total: ${formatMoney(m.total)}*\n${m.dateText}${m.payment ? `\nPago: ${m.payment}` : ''}\n\n${m.footer}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };
    const handleEmail = () => {
        const subject = `Nota de venta — ${m.title}${sale.id ? ` #${sale.id}` : ''}`;
        const body = `Hola ${m.clientName || ''},\n\nAquí tienes tu nota de venta:\n\n${saleLines(items)}\n\nTotal: ${formatMoney(m.total)}\n${m.dateText}${m.payment ? `\nPago: ${m.payment}` : ''}\n\n${m.footer}\n— ${m.title}`;
        window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <DSModal title="Nota de venta" onClose={onClose}>
            <div className="tk-receipt">
                <div className="tk-receipt-paper"><TicketPreview {...args} /></div>
                <div className="tk-receipt-actions">
                    <button type="button" className="tk-action tk-action--primary" disabled={!!busy}
                        onClick={() => run('print', () => printTicket(args))}>
                        <FaPrint aria-hidden="true" /> {busy === 'print' ? 'Preparando…' : 'Imprimir ticket'}
                    </button>
                    <button type="button" className="tk-action" disabled={!!busy}
                        onClick={() => run('pdf', () => downloadTicket(args))}>
                        <FaFilePdf aria-hidden="true" /> {busy === 'pdf' ? 'Generando…' : 'Descargar PDF'}
                    </button>
                    {phone && <button type="button" className="tk-action" onClick={handleWhatsApp}><FaWhatsapp aria-hidden="true" /> WhatsApp</button>}
                    {email && <button type="button" className="tk-action" onClick={handleEmail}><FaEnvelope aria-hidden="true" /> Correo</button>}
                </div>
                <p className="tk-receipt-hint">
                    Ticket de {m.config.paperWidth === 58 ? '58' : '80'} mm. En el diálogo de impresión elige tu impresora de tickets.
                    El formato se cambia en Sitio → Ticket de venta.
                </p>
            </div>
        </DSModal>
    );
};
