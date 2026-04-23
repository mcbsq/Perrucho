// src/utils/formatPhone.js
// ─────────────────────────────────────────────────────────────────────────────
// Máscara de teléfono mexicano: 10 dígitos → "55 1234 5678"
// Uso: onChange={e => setForm({...form, phone: formatMexPhone(e.target.value)})}
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