// src/utils/bookingRules.js
// ─────────────────────────────────────────────────────────────────────────────
// Reglas de negocio centralizadas para reservas y cancelaciones.
// Cambia MIN_CANCEL_HOURS para ajustar la ventana mínima de cancelación.
// ─────────────────────────────────────────────────────────────────────────────

// Horas mínimas de anticipación para que un cliente pueda cancelar su cita.
// Si la cita está a menos de este margen, debe contactar a la estética.
export const MIN_CANCEL_HOURS = 24;

// Estados en los que el cliente NO puede cancelar online (ya está en proceso o cerrada)
export const NON_CANCELLABLE_STATUSES = ['En proceso', 'Finalizada', 'Cancelada'];

// Teléfono de la estética (formato internacional sin '+') para wa.me/
// Cambiar aquí si cambia el número del negocio.
export const SHOP_WHATSAPP = '522283045591';
export const SHOP_NAME     = 'Perrucho';

/**
 * Determina si una cita puede ser cancelada por el cliente.
 * @param {Object} appt - { date, time, status }
 * @param {number} minHours - margen mínimo en horas (default MIN_CANCEL_HOURS)
 * @returns {{ ok: boolean, reason?: string, hoursLeft?: number }}
 */
export function canClientCancel(appt, minHours = MIN_CANCEL_HOURS) {
    if (!appt) return { ok: false, reason: 'Cita no encontrada' };

    if (NON_CANCELLABLE_STATUSES.includes(appt.status)) {
        return {
            ok: false,
            reason: `No se puede cancelar una cita ${appt.status.toLowerCase()}.`,
        };
    }

    if (!appt.date) return { ok: true };

    // Construir fecha+hora de la cita
    const timeStr = appt.time || '00:00';
    const apptDate = new Date(`${appt.date}T${timeStr}:00`);
    const now = new Date();
    const diffMs    = apptDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < minHours) {
        return {
            ok: false,
            reason: `Las cancelaciones deben hacerse con al menos ${minHours} horas de anticipación. Por favor contacta directamente a la estética por WhatsApp.`,
            hoursLeft: Math.max(0, Math.floor(diffHours)),
        };
    }

    return { ok: true, hoursLeft: Math.floor(diffHours) };
}