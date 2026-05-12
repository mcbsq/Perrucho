// src/utils/bookingRules.js
// ─────────────────────────────────────────────────────────────────────────────
// Reglas de negocio centralizadas para reservas y cancelaciones.
//
// ACTUALIZACIÓN según catálogo de servicios real:
// - Horario de citas: 10:15 a 17:00 (antes 09:00-19:00)
// - Tolerancia de 20 min para citas agendadas (pasado ese tiempo se
//   otorga el lugar a la siguiente mascota)
// - Cancelaciones con al menos MIN_CANCEL_HOURS de anticipación
// ─────────────────────────────────────────────────────────────────────────────

// Horas mínimas de anticipación para que un cliente pueda cancelar su cita.
export const MIN_CANCEL_HOURS = 24;

// Horario real de la estética para agendar citas
// (catálogo: "Los horarios para agendar citas son desde las 10:15am y hasta las 5pm")
export const SHOP_OPEN_TIME  = '10:15';
export const SHOP_CLOSE_TIME = '17:00';

// Tolerancia en minutos para citas agendadas
// (catálogo: "Se tendrá una tolerancia de 20min para citas agendadas")
export const APPT_TOLERANCE_MINUTES = 20;

// Estados en los que el cliente NO puede cancelar online
export const NON_CANCELLABLE_STATUSES = ['En proceso', 'Finalizada', 'Cancelada'];

// Teléfono de la estética (formato internacional sin '+') para wa.me/
export const SHOP_WHATSAPP = '522283045591';
export const SHOP_NAME     = 'Perrucho';

/**
 * Genera los slots de tiempo disponibles para agendar citas.
 * El primer slot es 10:15, luego cada hora: 11:00, 12:00, ... hasta 17:00.
 * (Los horarios exactos siguen siendo sugeridos — el groomer confirma disponibilidad)
 */
export function getBookingSlots() {
    return [
        '10:15',
        '11:00', '12:00', '13:00', '14:00',
        '15:00', '16:00', '17:00',
    ];
}

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

    const timeStr  = appt.time || '00:00';
    const apptDate = new Date(`${appt.date}T${timeStr}:00`);
    const now      = new Date();
    const diffMs   = apptDate.getTime() - now.getTime();
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