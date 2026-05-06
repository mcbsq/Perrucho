// src/utils/formatPhone.js
// ─────────────────────────────────────────────────────────────────────────────
// Máscara de teléfono mexicano: 10 dígitos → "55 1234 5678"
// + Validación específica para WhatsApp (mismos 10 dígitos).
// ─────────────────────────────────────────────────────────────────────────────

export function formatMexPhone(value) {
    // Solo dígitos, máximo 10
    const digits = String(value).replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) return '';
    if (digits.length <= 2)  return digits;
    if (digits.length <= 6)  return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
}

// Versión para validar (true si tiene exactamente 10 dígitos)
export function isValidMexPhone(value) {
    return String(value).replace(/\D/g, '').length === 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp validation
// El cliente especificó: "Se puede manejar únicamente número con whatsapp"
// En México, los números de celular válidos para WhatsApp son los 10 dígitos.
// La implementación es la misma que isValidMexPhone, pero con su propio
// nombre para claridad de intención al leer el código.
// ─────────────────────────────────────────────────────────────────────────────

export function isValidWhatsApp(value) {
    const digits = String(value).replace(/\D/g, '');
    return digits.length === 10;
}

/**
 * Devuelve un mensaje de error si el número no es válido para WhatsApp,
 * o cadena vacía si es válido. Útil para feedback inline en formularios.
 */
export function whatsAppValidationError(value) {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 0)  return 'Ingresa un número de WhatsApp.';
    if (digits.length < 10)   return `Faltan ${10 - digits.length} dígito(s). El WhatsApp en México tiene 10 dígitos.`;
    if (digits.length > 10)   return 'El número tiene más de 10 dígitos.';
    return '';
}

/**
 * Convierte un número formateado o no a formato internacional para wa.me/
 * Ej: "228 304 5591" → "522283045591"
 */
export function toWhatsAppLink(value) {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length !== 10) return '';
    return `52${digits}`; // prefijo de país México
}