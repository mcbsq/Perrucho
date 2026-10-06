import { buildTicketModel, resolveTicketConfig, formatMoney, DEFAULT_TICKET_CONFIG } from './ticketPdf';

const sale = {
    id: 7, total: 731, paymentMethod: 'tarjeta', status: 'pagado', date: '2026-10-05T14:32:00',
    items: [
        { name: 'Baño y corte', quantity: 1, price: 450 },
        { name: 'Shampoo', quantity: 2, price: 156 },
        { name: 'Descuento (5%)', quantity: 1, price: -31 },
    ],
};

describe('ticketPdf', () => {
    test('sin configuración guardada usa el formato por default (80 mm)', () => {
        expect(resolveTicketConfig({})).toEqual(DEFAULT_TICKET_CONFIG);
        expect(resolveTicketConfig({ ticketConfig: { paperWidth: 58 } }).paperWidth).toBe(58);
    });

    test('separa cargos y descuentos y calcula el subtotal', () => {
        const m = buildTicketModel({ sale, settings: { businessName: 'Taylor' } });
        expect(m.charges).toHaveLength(2);
        expect(m.discounts).toHaveLength(1);
        expect(m.subtotal).toBe(762);
        expect(m.total).toBe(731);
        expect(m.title).toBe('Taylor');
        expect(m.payment).toBe('Tarjeta');
        expect(m.status).toBe('');
    });

    test('respeta lo que el negocio decide ocultar', () => {
        const settings = { businessName: 'Taylor', businessAddress: 'Calle 1', ticketConfig: { showAddress: false, showClient: false, title: 'Taylor’s Pet', headerLines: 'RFC ABC\n\nRégimen X' } };
        const m = buildTicketModel({ sale, settings, client: { name: 'Ana' } });
        expect(m.address).toBe('');
        expect(m.clientName).toBe('');
        expect(m.title).toBe('Taylor’s Pet');
        expect(m.headerLines).toEqual(['RFC ABC', 'Régimen X']);
    });

    test('la sucursal manda sobre la dirección general', () => {
        const m = buildTicketModel({ sale, settings: { businessAddress: 'General' }, branch: { name: 'Norte', address: 'Av. Norte 1' } });
        expect(m.branchName).toBe('Norte');
        expect(m.address).toBe('Av. Norte 1');
    });

    test('formatea pesos con dos decimales', () => {
        expect(formatMoney(1234.5)).toBe('$1,234.50');
    });
});
