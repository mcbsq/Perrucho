// src/utils/pricingRules.test.js
import {
    getWeightRange,
    calcServicePrice,
    getAllPrices,
    weightRangeLabel,
    WEIGHT_RANGES,
} from './pricingRules';

describe('getWeightRange', () => {
    test('devuelve "mediano" cuando no hay peso (0, undefined, null, "")', () => {
        expect(getWeightRange(0).key).toBe('mediano');
        expect(getWeightRange(undefined).key).toBe('mediano');
        expect(getWeightRange(null).key).toBe('mediano');
        expect(getWeightRange('').key).toBe('mediano');
    });

    test('límites exactos de cada rango de peso', () => {
        // mini: 0-5
        expect(getWeightRange(1).key).toBe('mini');
        expect(getWeightRange(5).key).toBe('mini');
        // chico: 5-9 (el límite de 5 ya cae en mini por <=, así que 5.1 es chico)
        expect(getWeightRange(6).key).toBe('chico');
        expect(getWeightRange(9).key).toBe('chico');
        // mediano: 9-19
        expect(getWeightRange(9.5).key).toBe('mediano');
        expect(getWeightRange(19).key).toBe('mediano');
        // grande: 19-34
        expect(getWeightRange(19.5).key).toBe('grande');
        expect(getWeightRange(34).key).toBe('grande');
        // extra: 34-44
        expect(getWeightRange(34.5).key).toBe('extra');
        expect(getWeightRange(44).key).toBe('extra');
        // jumbo: 44+
        expect(getWeightRange(44.5).key).toBe('jumbo');
        expect(getWeightRange(200).key).toBe('jumbo');
    });

    test('peso extremadamente alto sigue devolviendo jumbo (fallback al último rango)', () => {
        expect(getWeightRange(99999).key).toBe('jumbo');
    });

    test('acepta peso como string numérico', () => {
        expect(getWeightRange('20').key).toBe('grande');
    });
});

describe('calcServicePrice', () => {
    test('devuelve 0 si no hay servicio', () => {
        expect(calcServicePrice(null, 10)).toBe(0);
        expect(calcServicePrice(undefined, 10)).toBe(0);
    });

    describe('pricingMode "weight" (tiers Mini→Jumbo)', () => {
        const service = {
            pricingMode: 'weight',
            priceMini: 100,
            priceChico: 150,
            priceMediano: 200,
            priceGrande: 250,
            priceExtra: 300,
            priceJumbo: 400,
            price: 999, // fallback legacy, no debe usarse si hay campo específico
        };

        test('selecciona el precio correcto por cada tier', () => {
            expect(calcServicePrice(service, 3)).toBe(100);   // mini
            expect(calcServicePrice(service, 7)).toBe(150);   // chico
            expect(calcServicePrice(service, 15)).toBe(200);  // mediano
            expect(calcServicePrice(service, 25)).toBe(250);  // grande
            expect(calcServicePrice(service, 40)).toBe(300);  // extra
            expect(calcServicePrice(service, 50)).toBe(400);  // jumbo
        });

        test('usa el precio legacy "price" como fallback si falta el campo del tier', () => {
            const partial = { pricingMode: 'weight', price: 120 };
            expect(calcServicePrice(partial, 3)).toBe(120);
        });

        test('sin pricingMode explícito se comporta igual que "weight" (default)', () => {
            const noMode = { priceMini: 80 };
            expect(calcServicePrice(noMode, 2)).toBe(80);
        });
    });

    describe('pricingMode "custom"', () => {
        test('usa la primera opción de customPriceOptions cuando existen', () => {
            const service = {
                pricingMode: 'custom',
                customPriceOptions: [
                    { label: 'Gelish', price: 250 },
                    { label: 'Acrílico', price: 350 },
                ],
            };
            expect(calcServicePrice(service, 10)).toBe(250);
        });

        test('cae al precio legacy "price" si no hay customPriceOptions', () => {
            const service = { pricingMode: 'custom', price: 180 };
            expect(calcServicePrice(service, 10)).toBe(180);
        });

        test('devuelve 0 si no hay opciones ni precio legacy', () => {
            const service = { pricingMode: 'custom' };
            expect(calcServicePrice(service, 10)).toBe(0);
        });

        test('ignora el peso por completo (no cambia el resultado)', () => {
            const service = {
                pricingMode: 'custom',
                customPriceOptions: [{ label: 'Corte caballero', price: 90 }],
            };
            expect(calcServicePrice(service, 1)).toBe(90);
            expect(calcServicePrice(service, 60)).toBe(90);
        });
    });
});

describe('getAllPrices', () => {
    test('devuelve un arreglo vacío si no hay servicio', () => {
        expect(getAllPrices(null)).toEqual([]);
    });

    test('devuelve un precio por cada uno de los 6 rangos', () => {
        const service = {
            priceMini: 10, priceChico: 20, priceMediano: 30,
            priceGrande: 40, priceExtra: 50, priceJumbo: 60,
        };
        const prices = getAllPrices(service);
        expect(prices).toHaveLength(WEIGHT_RANGES.length);
        expect(prices.map(p => p.price)).toEqual([10, 20, 30, 40, 50, 60]);
    });

    test('usa el precio legacy como fallback por rango faltante', () => {
        const service = { price: 99 };
        const prices = getAllPrices(service);
        expect(prices.every(p => p.price === 99)).toBe(true);
    });
});

describe('weightRangeLabel', () => {
    test('arma el label amigable con rango y descripción', () => {
        expect(weightRangeLabel(8)).toBe('Chico (6-9 kg)');
        expect(weightRangeLabel(3)).toBe('Mini (1-5 kg)');
        expect(weightRangeLabel(50)).toBe('Jumbo (45 kg+)');
    });
});
