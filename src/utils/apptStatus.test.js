// src/utils/apptStatus.test.js
import { validateSlot, STATUS_TRANSITIONS, APPT_STATUS } from './apptStatus';

describe('validateSlot', () => {
    const employees = [{ id: 'e1', capacity: 1 }, { id: 'e2', capacity: 2 }];
    // capacidad total = 3

    test('sin fecha u hora siempre es válido', () => {
        expect(validateSlot([], null, null, employees)).toEqual({ ok: true });
        expect(validateSlot([], '2026-07-10', null, employees)).toEqual({ ok: true });
    });

    test('slot libre sin citas previas es válido', () => {
        const result = validateSlot([], '2026-07-10', '11:00', employees);
        expect(result.ok).toBe(true);
    });

    test('sin empleados (capacidad total 0) siempre es válido', () => {
        const result = validateSlot([{ date: '2026-07-10', time: '11:00', status: 'Pendiente' }], '2026-07-10', '11:00', []);
        expect(result.ok).toBe(true);
    });

    test('detecta colisión cuando se excede la capacidad total', () => {
        const appointments = [
            { id: 1, date: '2026-07-10', time: '11:00', status: 'Pendiente' },
            { id: 2, date: '2026-07-10', time: '11:30', status: 'Confirmada' },
            { id: 3, date: '2026-07-10', time: '10:45', status: 'En proceso' },
        ];
        // Las 3 citas caen en el mismo slot de 1h (dentro de ±59 min de 11:00)
        const result = validateSlot(appointments, '2026-07-10', '11:00', employees);
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/No hay disponibilidad/);
    });

    test('permite agendar si aún hay capacidad disponible', () => {
        const appointments = [
            { id: 1, date: '2026-07-10', time: '11:00', status: 'Pendiente' },
        ];
        const result = validateSlot(appointments, '2026-07-10', '11:00', employees);
        expect(result.ok).toBe(true);
    });

    test('ignora citas canceladas o finalizadas al contar colisiones', () => {
        const appointments = [
            { id: 1, date: '2026-07-10', time: '11:00', status: 'Cancelada' },
            { id: 2, date: '2026-07-10', time: '11:00', status: 'Finalizada' },
            { id: 3, date: '2026-07-10', time: '11:00', status: 'Confirmada' },
        ];
        // Solo 1 cita activa cuenta, capacidad total 3 → libre
        const result = validateSlot(appointments, '2026-07-10', '11:00', employees);
        expect(result.ok).toBe(true);
    });

    test('ignora citas de otra fecha', () => {
        const appointments = [
            { id: 1, date: '2026-07-09', time: '11:00', status: 'Pendiente' },
            { id: 2, date: '2026-07-09', time: '11:15', status: 'Pendiente' },
            { id: 3, date: '2026-07-09', time: '11:30', status: 'Pendiente' },
        ];
        const result = validateSlot(appointments, '2026-07-10', '11:00', employees);
        expect(result.ok).toBe(true);
    });

    test('excluye la cita indicada por excludeId (edición de cita existente)', () => {
        const appointments = [
            { id: 1, date: '2026-07-10', time: '11:00', status: 'Pendiente' },
            { id: 2, date: '2026-07-10', time: '11:15', status: 'Pendiente' },
            { id: 3, date: '2026-07-10', time: '11:30', status: 'Pendiente' },
        ];
        // Sin excludeId, las 3 citas llenan la capacidad de 3
        expect(validateSlot(appointments, '2026-07-10', '11:00', employees).ok).toBe(false);
        // Excluyendo la cita 1 (la que se está editando), solo quedan 2 activas → cabe
        expect(validateSlot(appointments, '2026-07-10', '11:00', employees, 1).ok).toBe(true);
    });

    test('citas fuera de la ventana de ±59 min no cuentan como colisión', () => {
        const appointments = [
            { id: 1, date: '2026-07-10', time: '12:00', status: 'Pendiente' }, // 60 min de diferencia exacta
        ];
        const result = validateSlot(appointments, '2026-07-10', '11:00', employees);
        expect(result.ok).toBe(true);
    });
});

describe('STATUS_TRANSITIONS', () => {
    test('admin puede pasar de Pendiente a Confirmada o Cancelada, pero no a otros estados', () => {
        expect(STATUS_TRANSITIONS.admin[APPT_STATUS.PENDIENTE]).toEqual(
            expect.arrayContaining(['Confirmada', 'Cancelada'])
        );
        expect(STATUS_TRANSITIONS.admin[APPT_STATUS.PENDIENTE]).not.toContain('En proceso');
        expect(STATUS_TRANSITIONS.admin[APPT_STATUS.PENDIENTE]).not.toContain('Finalizada');
    });

    test('empleado no puede cancelar una cita En proceso (solo puede finalizarla)', () => {
        expect(STATUS_TRANSITIONS.empleado['En proceso']).toEqual(['Finalizada']);
        expect(STATUS_TRANSITIONS.empleado['En proceso']).not.toContain('Cancelada');
    });

    test('admin sí puede cancelar una cita En proceso', () => {
        expect(STATUS_TRANSITIONS.admin['En proceso']).toContain('Cancelada');
    });

    test('cliente solo puede cancelar, nunca confirmar ni iniciar servicio', () => {
        expect(STATUS_TRANSITIONS.cliente[APPT_STATUS.PENDIENTE]).toEqual(['Cancelada']);
        expect(STATUS_TRANSITIONS.cliente[APPT_STATUS.CONFIRMADA]).toEqual(['Cancelada']);
        expect(STATUS_TRANSITIONS.cliente['En proceso']).toEqual([]);
    });

    test('estados terminales (Finalizada, Cancelada) no permiten ninguna transición para ningún rol', () => {
        ['admin', 'empleado', 'cliente'].forEach(role => {
            expect(STATUS_TRANSITIONS[role].Finalizada).toEqual([]);
            expect(STATUS_TRANSITIONS[role].Cancelada).toEqual([]);
        });
    });
});
