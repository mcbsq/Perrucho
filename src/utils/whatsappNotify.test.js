// src/utils/whatsappNotify.test.js
import {
    clientToShopOnBooking,
    clientToShopOnCancelRequest,
    shopToClientOnConfirmation,
    shopToClientOnFinished,
} from './whatsappNotify';

const baseData = {
    clientName: 'Ana',
    clientPhone: '2283045591',
    petName: 'Firulais',
    serviceName: 'Baño y corte',
    date: '2026-07-15',
    time: '14:00',
};

describe('whatsappNotify link builders', () => {
    test('clientToShopOnBooking construye un link wa.me con el número fijo de la tienda', () => {
        const url = clientToShopOnBooking(baseData);
        expect(url).toMatch(/^https:\/\/wa\.me\/522283045591\?text=/);
        const decoded = decodeURIComponent(url);
        expect(decoded).toContain('Firulais');
        expect(decoded).toContain('Baño y corte');
    });

    test('clientToShopOnCancelRequest incluye el motivo cuando se especifica', () => {
        const url = clientToShopOnCancelRequest({ ...baseData, reason: 'Cambio de planes' });
        expect(decodeURIComponent(url)).toContain('Cambio de planes');
    });

    test('clientToShopOnCancelRequest omite el motivo si no se especifica', () => {
        const url = clientToShopOnCancelRequest(baseData);
        expect(decodeURIComponent(url)).not.toContain('Motivo:');
    });

    test('shopToClientOnConfirmation usa el teléfono del cliente (10 dígitos → prefijo 52)', () => {
        const url = shopToClientOnConfirmation(baseData);
        expect(url).toMatch(/^https:\/\/wa\.me\/522283045591\?text=/);
    });

    test('shopToClientOnConfirmation acepta un número ya en formato internacional', () => {
        const url = shopToClientOnConfirmation({ ...baseData, clientPhone: '522283045591' });
        expect(url).toMatch(/^https:\/\/wa\.me\/522283045591\?text=/);
    });

    test('devuelve cadena vacía si el teléfono no es válido (menos de 10 dígitos)', () => {
        expect(shopToClientOnFinished({ ...baseData, clientPhone: '123' })).toBe('');
    });
});
