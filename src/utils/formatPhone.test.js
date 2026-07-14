// src/utils/formatPhone.test.js
import {
    formatMexPhone,
    isValidMexPhone,
    isValidWhatsApp,
    whatsAppValidationError,
    toWhatsAppLink,
} from './formatPhone';

describe('formatMexPhone', () => {
    test('formatea progresivamente mientras se escribe', () => {
        expect(formatMexPhone('5')).toBe('5');
        expect(formatMexPhone('55')).toBe('55');
        expect(formatMexPhone('551')).toBe('55 1');
        expect(formatMexPhone('551234')).toBe('55 1234');
        expect(formatMexPhone('5512345678')).toBe('55 1234 5678');
    });

    test('ignora caracteres no numéricos', () => {
        expect(formatMexPhone('55-1234-5678')).toBe('55 1234 5678');
        expect(formatMexPhone('(55) 1234 5678')).toBe('55 1234 5678');
    });

    test('trunca a 10 dígitos', () => {
        expect(formatMexPhone('551234567890')).toBe('55 1234 5678');
    });

    test('cadena vacía devuelve cadena vacía', () => {
        expect(formatMexPhone('')).toBe('');
    });
});

describe('isValidMexPhone / isValidWhatsApp', () => {
    test('válido con exactamente 10 dígitos', () => {
        expect(isValidMexPhone('5512345678')).toBe(true);
        expect(isValidWhatsApp('55 1234 5678')).toBe(true);
    });

    test('inválido con menos o más de 10 dígitos', () => {
        expect(isValidMexPhone('551234567')).toBe(false);
        expect(isValidMexPhone('55123456789')).toBe(false);
        expect(isValidWhatsApp('123')).toBe(false);
    });
});

describe('whatsAppValidationError', () => {
    test('mensaje cuando está vacío', () => {
        expect(whatsAppValidationError('')).toBe('Ingresa un número de WhatsApp.');
    });

    test('mensaje cuando faltan dígitos', () => {
        expect(whatsAppValidationError('551234')).toMatch(/Faltan 4 dígito/);
    });

    test('mensaje cuando sobran dígitos', () => {
        expect(whatsAppValidationError('551234567890')).toBe('El número tiene más de 10 dígitos.');
    });

    test('cadena vacía cuando es válido', () => {
        expect(whatsAppValidationError('5512345678')).toBe('');
    });
});

describe('toWhatsAppLink', () => {
    test('agrega el prefijo de país 52 a un número de 10 dígitos', () => {
        expect(toWhatsAppLink('228 304 5591')).toBe('522283045591');
    });

    test('devuelve cadena vacía si no tiene exactamente 10 dígitos', () => {
        expect(toWhatsAppLink('123')).toBe('');
        expect(toWhatsAppLink('')).toBe('');
    });
});
