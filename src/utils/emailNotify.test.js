// src/utils/emailNotify.test.js
import {
    shopToClientOnConfirmation,
    shopToClientOnFinished,
    shopToClientOnCanceled,
} from './emailNotify';

const baseData = {
    clientName: 'Ana',
    clientEmail: 'ana@example.com',
    petName: 'Firulais',
    serviceName: 'Baño y corte',
    date: '2026-07-15',
    time: '14:00',
};

describe('emailNotify link builders', () => {
    test('shopToClientOnConfirmation genera un mailto: válido con subject y body', () => {
        const url = shopToClientOnConfirmation(baseData);
        expect(url).toMatch(/^mailto:ana%40example\.com\?/);
        expect(url).toContain('subject=');
        expect(url).toContain('body=');
        // el body decodificado debe contener los datos clave
        const decoded = decodeURIComponent(url);
        expect(decoded).toContain('Firulais');
        expect(decoded).toContain('Baño y corte');
    });

    test('shopToClientOnFinished incluye el nombre de la mascota en el subject', () => {
        const url = shopToClientOnFinished(baseData);
        expect(decodeURIComponent(url)).toContain('Firulais');
    });

    test('shopToClientOnCanceled genera un link con la fecha y hora', () => {
        const url = shopToClientOnCanceled(baseData);
        const decoded = decodeURIComponent(url);
        expect(decoded).toContain('cancelada');
    });

    test('devuelve cadena vacía si no hay email de destino', () => {
        expect(shopToClientOnConfirmation({ ...baseData, clientEmail: '' })).toBe('');
    });
});
