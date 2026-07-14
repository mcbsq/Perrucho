// src/utils/bookingRules.test.js
import {
    getBookingSlots,
    canClientCancel,
    MIN_CANCEL_HOURS,
    NON_CANCELLABLE_STATUSES,
} from './bookingRules';

describe('getBookingSlots', () => {
    test('devuelve los horarios fijos de 10:15 a 17:00', () => {
        expect(getBookingSlots()).toEqual([
            '10:15', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
        ]);
    });
});

describe('canClientCancel', () => {
    test('no encontrada si no hay cita', () => {
        expect(canClientCancel(null)).toEqual({ ok: false, reason: 'Cita no encontrada' });
    });

    test.each(NON_CANCELLABLE_STATUSES)('no se puede cancelar una cita en estado "%s"', (status) => {
        const appt = { date: '2099-01-01', time: '11:00', status };
        const result = canClientCancel(appt);
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(new RegExp(status.toLowerCase()));
    });

    test('sin fecha se permite cancelar (no hay forma de calcular anticipación)', () => {
        const appt = { status: 'Pendiente' };
        expect(canClientCancel(appt)).toEqual({ ok: true });
    });

    test('rechaza cancelación si faltan menos de MIN_CANCEL_HOURS', () => {
        const soon = new Date(Date.now() + 2 * 60 * 60 * 1000); // en 2 horas
        const date = soon.toISOString().slice(0, 10);
        const time = `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`;
        const appt = { date, time, status: 'Pendiente' };
        const result = canClientCancel(appt);
        expect(result.ok).toBe(false);
        expect(result.reason).toMatch(new RegExp(`al menos ${MIN_CANCEL_HOURS} horas`));
    });

    test('permite cancelación si hay más de MIN_CANCEL_HOURS de anticipación', () => {
        const future = new Date(Date.now() + 48 * 60 * 60 * 1000); // en 48 horas
        const date = future.toISOString().slice(0, 10);
        const time = `${String(future.getHours()).padStart(2, '0')}:${String(future.getMinutes()).padStart(2, '0')}`;
        const appt = { date, time, status: 'Confirmada' };
        const result = canClientCancel(appt);
        expect(result.ok).toBe(true);
        expect(result.hoursLeft).toBeGreaterThanOrEqual(MIN_CANCEL_HOURS - 1);
    });

    test('respeta un minHours custom', () => {
        const soon = new Date(Date.now() + 5 * 60 * 60 * 1000); // en 5 horas
        const date = soon.toISOString().slice(0, 10);
        const time = `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`;
        const appt = { date, time, status: 'Pendiente' };
        expect(canClientCancel(appt, 2).ok).toBe(true);
        expect(canClientCancel(appt, 10).ok).toBe(false);
    });
});
