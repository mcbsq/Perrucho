-- Nuevo valor de enum para poder cancelar una venta (feedback real del
-- cliente: "agregar opción cancelar venta y que se vea reflejado en el
-- sistema"). Aditivo — no cambia el comportamiento de ninguna venta existente.
ALTER TYPE "SaleStatus" ADD VALUE 'cancelado';
