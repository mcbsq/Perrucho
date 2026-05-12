// src/utils/pricingRules.js
// ─────────────────────────────────────────────────────────────────────────────
// Modelo de precios con 6 rangos de peso según el catálogo real de Perrucho.
//
// Estructura del catálogo:
//   Mini    1 - 5 kg  → precio base
//   Chico   6 - 9 kg
//   Mediano 10-19 kg
//   Grande  20-34 kg
//   Extra   35-44 kg
//   Jumbo   45 kg+
//
// Cada servicio en db.json tiene los campos:
//   priceMini, priceChico, priceMediano, priceGrande, priceExtra, priceJumbo
//
// El campo legacy `price` se mantiene como fallback para compatibilidad.
// ─────────────────────────────────────────────────────────────────────────────

// Rangos de peso en orden ascendente
export const WEIGHT_RANGES = [
    { key: 'mini',    label: 'Mini',    min: 0,  max: 5,   desc: '1-5 kg'   },
    { key: 'chico',   label: 'Chico',   min: 5,  max: 9,   desc: '6-9 kg'   },
    { key: 'mediano', label: 'Mediano', min: 9,  max: 19,  desc: '10-19 kg' },
    { key: 'grande',  label: 'Grande',  min: 19, max: 34,  desc: '20-34 kg' },
    { key: 'extra',   label: 'Extra',   min: 34, max: 44,  desc: '35-44 kg' },
    { key: 'jumbo',   label: 'Jumbo',   min: 44, max: 999, desc: '45 kg+'   },
];

// Campos de precio en db.json por rango
export const PRICE_FIELD = {
    mini:    'priceMini',
    chico:   'priceChico',
    mediano: 'priceMediano',
    grande:  'priceGrande',
    extra:   'priceExtra',
    jumbo:   'priceJumbo',
};

/**
 * Determina el rango de peso de una mascota.
 * @param {number|string} weight - peso en kg
 * @returns {Object} el rango correspondiente (uno de WEIGHT_RANGES)
 */
export function getWeightRange(weight) {
    const w = Number(weight) || 0;
    // Si no hay peso, devolver el rango más común (mediano)
    if (!w) return WEIGHT_RANGES.find(r => r.key === 'mediano');
    return WEIGHT_RANGES.find(r => w <= r.max) || WEIGHT_RANGES[WEIGHT_RANGES.length - 1];
}

/**
 * Calcula el precio de un servicio según el peso de la mascota.
 * Usa el campo específico del rango o cae back al precio base.
 *
 * @param {Object} service  - objeto de servicio con los campos priceMini, etc.
 * @param {number|string} weight - peso de la mascota en kg
 * @returns {number} precio calculado
 */
export function calcServicePrice(service, weight) {
    if (!service) return 0;
    const range = getWeightRange(weight);
    const field = PRICE_FIELD[range.key];
    // Usar el precio del rango si existe, si no el precio base
    const price = service[field] ?? service.price ?? 0;
    return Number(price);
}

/**
 * Obtiene todos los precios de un servicio para mostrar la tabla completa.
 * @param {Object} service
 * @returns {Array<{label, desc, price}>}
 */
export function getAllPrices(service) {
    if (!service) return [];
    return WEIGHT_RANGES.map(range => ({
        key:   range.key,
        label: range.label,
        desc:  range.desc,
        price: Number(service[PRICE_FIELD[range.key]] ?? service.price ?? 0),
    }));
}

/**
 * Label amigable del rango de una mascota según su peso.
 * Ej: 8 kg → "Chico (6-9 kg)"
 */
export function weightRangeLabel(weight) {
    const range = getWeightRange(weight);
    return `${range.label} (${range.desc})`;
}