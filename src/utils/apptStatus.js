// src/utils/apptStatus.js
// ─── Estados de cita — fuente única de verdad ─────────────────────────────────

export const APPT_STATUS = {
    PENDIENTE:  'Pendiente',
    CONFIRMADA: 'Confirmada',
    EN_PROCESO: 'En proceso',
    FINALIZADA: 'Finalizada',
    CANCELADA:  'Cancelada',
};

// Color por estado (bg, border, text, dot)
export const STATUS_COLORS = {
    Pendiente:    { bg: '#EFF6FF', border: '#74b9ff', text: '#1e3a8a', dot: '#74b9ff' },
    Confirmada:   { bg: '#EEF2FF', border: '#818cf8', text: '#3730a3', dot: '#818cf8' },
    'En proceso': { bg: '#FEF3C7', border: '#f59e0b', text: '#78350f', dot: '#f59e0b' },
    Finalizada:   { bg: '#ECFDF5', border: '#10b981', text: '#064e3b', dot: '#10b981' },
    Cancelada:    { bg: '#F3F4F6', border: '#9ca3af', text: '#4b5563', dot: '#9ca3af' },
};

// Emoji por estado
export const STATUS_EMOJI = {
    Pendiente:    '📋',
    Confirmada:   '✅',
    'En proceso': '⚙️',
    Finalizada:   '🏁',
    Cancelada:    '❌',
};

// Transiciones permitidas por rol
// null o array vacío = no puede cambiar a ese estado
export const STATUS_TRANSITIONS = {
    admin: {
        Pendiente:    ['Confirmada', 'Cancelada'],
        Confirmada:   ['En proceso', 'Cancelada'],
        'En proceso': ['Finalizada', 'Cancelada'],
        Finalizada:   [],
        Cancelada:    [],
    },
    empleado: {
        Pendiente:    ['Confirmada', 'Cancelada'],
        Confirmada:   ['En proceso', 'Cancelada'],
        'En proceso': ['Finalizada'],
        Finalizada:   [],
        Cancelada:    [],
    },
    // El cliente solo puede cancelar (y solo dentro de la ventana permitida,
    // controlada por canClientCancel() en bookingRules.js)
    cliente: {
        Pendiente:    ['Cancelada'],
        Confirmada:   ['Cancelada'],
        'En proceso': [],
        Finalizada:   [],
        Cancelada:    [],
    },
};

// Label de botón de acción principal por estado
export const STATUS_ACTION_LABEL = {
    admin: {
        Pendiente:    { label: 'Confirmar cita',     icon: '✅', style: 'confirm' },
        Confirmada:   { label: 'Iniciar servicio',   icon: '⚙️', style: 'process' },
        'En proceso': { label: 'Finalizar y cobrar', icon: '🏁', style: 'finish'  },
        Finalizada:   null,
        Cancelada:    null,
    },
    empleado: {
        Pendiente:    { label: 'Aceptar cita',      icon: '✅', style: 'confirm' },
        Confirmada:   { label: 'Iniciar servicio',  icon: '⚙️', style: 'process' },
        'En proceso': { label: 'Marcar finalizado', icon: '🏁', style: 'finish'  },
        Finalizada:   null,
        Cancelada:    null,
    },
};

// Validar si un slot está disponible
// appointments: todas las citas existentes
// date, time: de la nueva cita
// employees: array de users con role==='empleado'
// excludeId: id de cita a excluir (para edición)
export function validateSlot(appointments, date, time, employees, excludeId = null) {
    if (!date || !time) return { ok: true };

    // Capacidad total = suma de capacity de todos los empleados (default 1 c/u)
    const totalCapacity = employees.reduce((sum, e) => sum + (Number(e.capacity) || 1), 0);
    if (totalCapacity === 0) return { ok: true };

    // Contar citas activas en ese slot (misma fecha, misma hora ±59 min, no canceladas/finalizadas)
    const [h, m] = time.split(':').map(Number);
    const slotMin = h * 60 + m;

    const conflicts = appointments.filter(a => {
        if (a.id === excludeId) return false;
        if (a.date !== date) return false;
        if (a.status === 'Cancelada' || a.status === 'Finalizada') return false;
        if (!a.time) return false;
        const [ah, am] = a.time.split(':').map(Number);
        const aMin = ah * 60 + am;
        return Math.abs(aMin - slotMin) < 60; // mismo slot de 1 hora
    });

    if (conflicts.length >= totalCapacity) {
        return {
            ok: false,
            message: `No hay disponibilidad a las ${time} del ${date}. Hay ${conflicts.length} cita(s) y solo ${totalCapacity} recurso(s) disponible(s).`,
        };
    }
    return { ok: true };
}