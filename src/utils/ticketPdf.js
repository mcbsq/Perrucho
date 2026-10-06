// src/utils/ticketPdf.js
//
// Ticket de venta en PDF para impresoras térmicas (rollo de 58 u 80 mm).
// El PDF mide exactamente el ancho del rollo y su alto se calcula según el
// contenido (sin hojas carta con un ticket chiquito en una esquina), así la
// impresora corta justo al terminar. El formato es por negocio y se edita en
// Personalización → Ticket de venta (Settings.ticketConfig).
import { jsPDF } from 'jspdf';

export const PAPER_OPTIONS = [
    { value: 58, label: '58 mm', hint: 'Rollo angosto (impresoras portátiles)' },
    { value: 80, label: '80 mm', hint: 'Rollo estándar de punto de venta' },
];

export const DEFAULT_TICKET_CONFIG = {
    paperWidth: 80,
    fontSize: 'normal',        // 'compacta' | 'normal' | 'grande'
    showLogo: true,
    title: '',                 // vacío = nombre del negocio
    headerLines: '',           // texto libre: razón social, RFC, régimen…
    showBranch: true,
    showAddress: true,
    showPhone: true,
    showFolio: true,
    showDate: true,
    showClient: true,
    showCashier: true,
    showPaymentMethod: true,
    footerMessage: '¡Gracias por tu preferencia!',
    legalText: '',             // ej. "Este ticket no es un comprobante fiscal."
    autoPrint: true,           // abrir el diálogo de impresión al generar
};

export const resolveTicketConfig = (settings) => ({
    ...DEFAULT_TICKET_CONFIG,
    ...((settings && typeof settings.ticketConfig === 'object' && settings.ticketConfig) || {}),
});

const PAYMENT_LABEL = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
const STATUS_LABEL = { pagado: 'Pagado', pendiente: 'Pendiente de pago', cancelado: 'Cancelada' };

export const formatMoney = (n) =>
    `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Helvetica de jsPDF solo trae Latin-1: los acentos y la ñ salen bien, pero
// los emojis (comunes en nombres de servicios de este sistema) saldrían como
// basura. Se quitan aquí en vez de exigir que nadie los use.
const clean = (text) => String(text ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E -ÿ\n]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();

// Datos de un renglón, compartidos entre el PDF y la vista previa en HTML.
export const buildTicketModel = ({ sale, settings, branch, client, cashierName }) => {
    const config = resolveTicketConfig(settings);
    const items = (sale?.items?.length ? sale.items : [{ name: 'Venta', quantity: 1, price: sale?.total || 0 }])
        .map(i => ({ name: i.name || i.product?.name || 'Concepto', quantity: Number(i.quantity) || 1, price: Number(i.price) || 0 }));
    const charges = items.filter(i => i.price >= 0);
    const discounts = items.filter(i => i.price < 0);
    const subtotal = charges.reduce((a, i) => a + i.price * i.quantity, 0);
    const date = new Date(sale?.date || sale?.createdAt || Date.now());
    const b = branch || sale?.branch || null;
    return {
        config,
        title: config.title?.trim() || settings?.businessName || 'Mi negocio',
        logoUrl: config.showLogo ? settings?.logoUrl : null,
        headerLines: (config.headerLines || '').split('\n').map(l => l.trim()).filter(Boolean),
        branchName: config.showBranch && b?.name ? b.name : '',
        address: config.showAddress ? (b?.address || settings?.businessAddress || '') : '',
        phone: config.showPhone ? (b?.phone || settings?.whatsappNumber || '') : '',
        folio: config.showFolio && sale?.id ? `Folio #${sale.id}` : '',
        dateText: config.showDate
            ? date.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '',
        clientName: config.showClient ? (client?.name || sale?.client?.name || 'Cliente mostrador') : '',
        cashierName: config.showCashier ? (cashierName || '') : '',
        charges,
        discounts,
        subtotal,
        total: Number(sale?.total ?? subtotal + discounts.reduce((a, i) => a + i.price * i.quantity, 0)),
        payment: config.showPaymentMethod ? (PAYMENT_LABEL[sale?.paymentMethod] || sale?.paymentMethod || '') : '',
        status: sale?.status && sale.status !== 'pagado' ? (STATUS_LABEL[sale.status] || sale.status) : '',
        footer: config.footerMessage || '',
        legal: config.legalText || '',
    };
};

// Las térmicas imprimen en un solo tono: el logo se pasa a escala de grises
// sobre fondo blanco (las transparencias salen negras en algunas impresoras)
// y a PNG, que jsPDF sí acepta (no acepta webp).
const loadLogoForPrint = (url) => new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        try {
            const maxSide = 360;
            const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h);
            for (let i = 0; i < data.data.length; i += 4) {
                const g = 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2];
                data.data[i] = data.data[i + 1] = data.data[i + 2] = g;
            }
            ctx.putImageData(data, 0, 0);
            resolve({ dataUrl: canvas.toDataURL('image/png'), w, h });
        } catch {
            resolve(null); // imagen de otro dominio sin CORS: el ticket sale sin logo
        }
    };
    img.onerror = () => resolve(null);
    img.src = url;
});

const FONT_PT = { compacta: { 58: 7, 80: 8 }, normal: { 58: 8, 80: 9 }, grande: { 58: 9, 80: 10.5 } };
const PT_TO_MM = 0.3528;

// Dibuja el ticket. Con `measureOnly` no pinta nada y solo regresa el alto
// que ocupa — así el PDF final se crea exactamente de ese alto.
const drawTicket = (doc, model, logo, measureOnly) => {
    const W = model.config.paperWidth === 58 ? 58 : 80;
    const margin = W === 58 ? 3 : 4;
    const inner = W - margin * 2;
    const base = FONT_PT[model.config.fontSize]?.[W] || FONT_PT.normal[W];
    const lh = (pt) => pt * PT_TO_MM * 1.28;
    let y = margin + 1;

    const text = (str, x, opts = {}) => { if (!measureOnly) doc.text(str, x, y, opts); };
    const setFont = (pt, style = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(pt); };

    const centered = (str, pt, style = 'normal') => {
        if (!str) return;
        setFont(pt, style);
        doc.splitTextToSize(clean(str), inner).forEach(line => {
            y += lh(pt);
            text(line, W / 2, { align: 'center' });
        });
    };
    const pair = (left, right, pt, style = 'normal') => {
        setFont(pt, style);
        const rightW = right ? doc.getTextWidth(clean(right)) + 2 : 0;
        const leftLines = doc.splitTextToSize(clean(left), Math.max(inner - rightW, inner * 0.4));
        leftLines.forEach((line, i) => {
            y += lh(pt);
            text(line, margin);
            if (i === 0 && right) text(clean(right), W - margin, { align: 'right' });
        });
    };
    const rule = () => {
        y += lh(base) * 0.55;
        if (!measureOnly) {
            doc.setLineDashPattern([0.8, 0.8], 0);
            doc.setLineWidth(0.2);
            doc.line(margin, y, W - margin, y);
            doc.setLineDashPattern([], 0);
        }
        y += lh(base) * 0.15;
    };

    if (logo) {
        const maxW = inner * 0.5;
        const maxH = 18;
        const ratio = Math.min(maxW / logo.w, maxH / logo.h);
        const w = logo.w * ratio, h = logo.h * ratio;
        if (!measureOnly) doc.addImage(logo.dataUrl, 'PNG', (W - w) / 2, y, w, h);
        y += h + 1;
    }
    centered(model.title, base + 3, 'bold');
    model.headerLines.forEach(l => centered(l, base - 0.5));
    if (model.branchName) centered(model.branchName, base, 'bold');
    centered(model.address, base - 0.5);
    if (model.phone) centered(`Tel. ${model.phone}`, base - 0.5);

    rule();
    if (model.folio || model.dateText) pair(model.folio, model.dateText, base);
    if (model.clientName) pair(`Cliente: ${model.clientName}`, '', base);
    if (model.cashierName) pair(`Atendió: ${model.cashierName}`, '', base);

    rule();
    model.charges.forEach(item => {
        pair(item.name, '', base, 'bold');
        pair(`  ${item.quantity} x ${formatMoney(item.price)}`, formatMoney(item.price * item.quantity), base);
    });

    rule();
    if (model.discounts.length) {
        pair('Subtotal', formatMoney(model.subtotal), base);
        model.discounts.forEach(d => pair(d.name, `-${formatMoney(Math.abs(d.price * d.quantity))}`, base));
    }
    y += lh(base) * 0.2;
    pair('TOTAL', formatMoney(model.total), base + 3, 'bold');
    if (model.payment) pair(`Pago: ${model.payment}`, '', base);
    if (model.status) pair(model.status.toUpperCase(), '', base, 'bold');

    if (model.footer || model.legal) rule();
    if (model.footer) centered(model.footer, base, 'bold');
    if (model.legal) centered(model.legal, base - 1.5);

    return y + margin + 2;
};

export const buildTicketPdf = async (args) => {
    const model = buildTicketModel(args);
    const W = model.config.paperWidth === 58 ? 58 : 80;
    const logo = await loadLogoForPrint(model.logoUrl);
    const probe = new jsPDF({ unit: 'mm', format: [W, 1000] });
    const height = Math.max(60, Math.ceil(drawTicket(probe, model, logo, true)));
    const doc = new jsPDF({ unit: 'mm', format: [W, height], orientation: 'portrait' });
    doc.setProperties({ title: `Ticket ${args.sale?.id ? `#${args.sale.id}` : ''} — ${model.title}`.trim() });
    drawTicket(doc, model, logo, false);
    return { doc, model };
};

// Abre el ticket en una pestaña nueva con el diálogo de impresión listo
// (eligen ahí la impresora térmica). Si el navegador bloquea la pestaña,
// se descarga el PDF en su lugar.
export const printTicket = async (args) => {
    const preview = window.open('', '_blank');
    const { doc, model } = await buildTicketPdf(args);
    if (model.config.autoPrint) doc.autoPrint();
    const url = doc.output('bloburl');
    if (preview) {
        preview.location.href = url;
    } else {
        doc.save(`ticket-${args.sale?.id || 'venta'}.pdf`);
    }
};

export const downloadTicket = async (args) => {
    const { doc } = await buildTicketPdf(args);
    doc.save(`ticket-${args.sale?.id || 'venta'}.pdf`);
};
