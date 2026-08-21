// src/utils/dateLocal.js
//
// `new Date().toISOString().split('T')[0]` da la fecha en UTC, no en la
// zona horaria de quien usa la app — en México (UTC-6), entre medianoche y
// las 6pm UTC (18:00-23:59 hora local del día anterior) esto devolvía el
// día siguiente como "hoy", bloqueando ese día como mínimo seleccionable en
// los selectores de fecha. Bug real reportado por el cliente.
export const todayLocalDateStr = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};
