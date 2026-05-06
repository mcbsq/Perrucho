// src/utils/emailNotify.js
// ─────────────────────────────────────────────────────────────────────────────
// Generador de links mailto: con asuntos y cuerpos pre-llenados para notificar
// a los clientes sobre eventos de su cita.
//
// Funciona sin API ni costo: abre el cliente de correo del empleado (Gmail,
// Outlook, etc.) con el mensaje listo. El empleado solo presiona "enviar".
//
// Si más adelante se quiere automatizar el envío, basta con cambiar la
// implementación de openEmail() para que use EmailJS o un endpoint del backend.
// ─────────────────────────────────────────────────────────────────────────────

import { SHOP_NAME } from './bookingRules';

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
 * Construye un link mailto con subject y body codificados.
 * @param {string} email - dirección de correo del destinatario
 * @param {string} subject - asunto del correo
 * @param {string} body - cuerpo del correo (texto plano)
 * @returns {string} URL completa mailto:...?subject=...&body=...
 */
function buildMailto(email, subject, body) {
    if (!email) return '';
    const params = new URLSearchParams();
    params.set('subject', subject);
    params.set('body', body);
    // Reemplazamos los '+' que URLSearchParams genera por %20 porque algunos
    // clientes de correo (Outlook web) los muestran literal en lugar de espacio.
    const qs = params.toString().replace(/\+/g, '%20');
    return `mailto:${encodeURIComponent(email)}?${qs}`;
}

// ── Plantillas de mensajes ──────────────────────────────────────────────────

/**
 * Email del NEGOCIO al CLIENTE confirmando su cita
 * (cuando el empleado cambia el estado a "Confirmada").
 */
export function shopToClientOnConfirmation({ clientName, clientEmail, petName, serviceName, date, time }) {
    const subject = `${SHOP_NAME} — Tu cita ha sido confirmada ✅`;
    const body =
`Hola ${clientName},

¡Buenas noticias! Tu cita en ${SHOP_NAME} ha sido CONFIRMADA.

Detalles:
• Mascota: ${petName}
• Servicio: ${serviceName}
• Fecha: ${fmtDateLong(date)}
• Hora: ${fmt12(time)}

Te esperamos puntual. Si necesitas reagendar, avísanos con al menos 24 horas de anticipación.

¡Gracias por confiar en nosotros!

— El equipo de ${SHOP_NAME} 🐾`;
    return buildMailto(clientEmail, subject, body);
}

/**
 * Email del NEGOCIO al CLIENTE cuando la cita está finalizada
 * (la mascota está lista para recoger).
 */
export function shopToClientOnFinished({ clientName, clientEmail, petName, serviceName }) {
    const subject = `${SHOP_NAME} — ${petName} ya está listo(a) 🐾`;
    const body =
`Hola ${clientName},

¡${petName} ya está listo(a) tras su servicio de ${serviceName}!

Puedes pasar a recogerlo(a) cuando gustes.

¡Gracias por confiar en ${SHOP_NAME}! Esperamos verte pronto de nuevo.

— El equipo de ${SHOP_NAME} 🐾`;
    return buildMailto(clientEmail, subject, body);
}

/**
 * Email del NEGOCIO al CLIENTE cuando se cancela una cita.
 */
export function shopToClientOnCanceled({ clientName, clientEmail, petName, serviceName, date, time }) {
    const subject = `${SHOP_NAME} — Tu cita ha sido cancelada`;
    const body =
`Hola ${clientName},

Te informamos que tu cita ha sido cancelada:

• Mascota: ${petName}
• Servicio: ${serviceName}
• Fecha: ${fmtDateLong(date)}
• Hora: ${fmt12(time)}

Si quieres reagendar, puedes hacerlo desde tu perfil en la página o contactándonos directamente.

— El equipo de ${SHOP_NAME} 🐾`;
    return buildMailto(clientEmail, subject, body);
}

/**
 * Helper genérico: abre el link mailto en una nueva pestaña.
 * El cliente de correo del empleado (Gmail, Outlook, Apple Mail) toma el
 * relevo y muestra el mensaje pre-llenado listo para enviar.
 *
 * Si no se puede generar (sin email válido), devuelve false.
 */
export function openEmail(url) {
    if (!url) return false;
    // mailto: NO necesita target=_blank porque el navegador lo intercepta
    // y abre el cliente de correo nativo. Pero en navegadores con webmail
    // como Gmail por defecto, sí abre nueva pestaña — lo dejamos así.
    window.location.href = url;
    return true;
}