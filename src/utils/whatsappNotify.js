// src/utils/whatsappNotify.js
// ─────────────────────────────────────────────────────────────────────────────
// Generador de links wa.me/ con mensajes pre-llenados para notificar a los
// clientes sobre eventos de su cita (confirmación, cancelación, recordatorio).
//
// Funciona sin API ni costo: abre WhatsApp Web/App con el mensaje listo,
// y el empleado/cliente solo presiona "enviar".
// ─────────────────────────────────────────────────────────────────────────────

import { toWhatsAppLink } from './formatPhone';
import { SHOP_NAME, SHOP_WHATSAPP } from './bookingRules';

const fmtDateLong = (iso) => {
    if (!iso) return '';
    try {
        return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long',
        });
    } catch { return iso; }
};

const fmt12 = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Construye el link wa.me con un mensaje codificado.
 * @param {string} phone10 - número de 10 dígitos (con o sin formato) o internacional
 * @param {string} message - texto del mensaje
 * @returns {string} URL completa wa.me/...?text=...
 */
function buildWaLink(phone, message) {
    // Si ya viene en formato internacional (12+ dígitos), usar tal cual.
    // Si no, asumir 10 dígitos México.
    const digits = String(phone).replace(/\D/g, '');
    let intl;
    if (digits.length === 10) intl = `52${digits}`;
    else if (digits.length >= 11) intl = digits;
    else return '';
    return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

// ── Plantillas de mensajes ──────────────────────────────────────────────────

/**
 * Mensaje del cliente AL NEGOCIO confirmando que acaba de reservar.
 * Útil para que el cliente avise por WhatsApp tras hacer la reserva online.
 */
export function clientToShopOnBooking({ clientName, petName, serviceName, date, time }) {
    const msg =
`¡Hola ${SHOP_NAME}! 🐾
Acabo de reservar una cita por la página:

👤 Cliente: ${clientName}
🐶 Mascota: ${petName}
✂️ Servicio: ${serviceName}
📅 Fecha: ${fmtDateLong(date)}
🕐 Hora: ${fmt12(time)}

Quedo atento(a) a la confirmación. ¡Gracias!`;
    return buildWaLink(SHOP_WHATSAPP, msg);
}

/**
 * Mensaje del cliente AL NEGOCIO solicitando cancelación.
 * Se usa cuando la cita está dentro de la ventana de horas mínimas.
 */
export function clientToShopOnCancelRequest({ clientName, petName, serviceName, date, time, reason }) {
    const msg =
`Hola ${SHOP_NAME} 🐾
Necesito cancelar/reagendar mi cita:

👤 ${clientName}
🐶 ${petName}
✂️ ${serviceName}
📅 ${fmtDateLong(date)} · 🕐 ${fmt12(time)}
${reason ? `\n💬 Motivo: ${reason}` : ''}

¿Podemos coordinar otro horario? Gracias.`;
    return buildWaLink(SHOP_WHATSAPP, msg);
}

/**
 * Mensaje del cliente AL NEGOCIO notificando cancelación que sí procedió online.
 */
export function clientToShopOnCancelDone({ clientName, petName, serviceName, date, time }) {
    const msg =
`Hola ${SHOP_NAME} 🐾
Cancelé mi cita desde la página:

👤 ${clientName}
🐶 ${petName}
✂️ ${serviceName}
📅 ${fmtDateLong(date)} · 🕐 ${fmt12(time)}

Espero poder reagendar pronto. ¡Gracias!`;
    return buildWaLink(SHOP_WHATSAPP, msg);
}

/**
 * Mensaje del NEGOCIO AL CLIENTE confirmando su cita (cuando el empleado
 * cambia el estado a "Confirmada").
 */
export function shopToClientOnConfirmation({ clientName, clientPhone, petName, serviceName, date, time }) {
    const msg =
`¡Hola ${clientName}! 🐾
Tu cita en ${SHOP_NAME} ha sido *CONFIRMADA* ✅

🐶 ${petName}
✂️ ${serviceName}
📅 ${fmtDateLong(date)}
🕐 ${fmt12(time)}

Te esperamos. Si necesitas reagendar, avísanos con al menos 24h de anticipación.`;
    return buildWaLink(clientPhone, msg);
}

/**
 * Mensaje del NEGOCIO AL CLIENTE cuando la cita está lista (Finalizada).
 */
export function shopToClientOnFinished({ clientName, clientPhone, petName, serviceName }) {
    const msg =
`¡Hola ${clientName}! 🐾
${petName} ya está listo(a) tras su servicio de *${serviceName}*.

¡Gracias por confiar en ${SHOP_NAME}! 💚`;
    return buildWaLink(clientPhone, msg);
}

/**
 * Helper genérico: abre el link en una nueva pestaña.
 * Si no se puede generar (sin teléfono válido), devuelve false.
 */
export function openWhatsApp(url) {
    if (!url) return false;
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
}