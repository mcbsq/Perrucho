// api/lib/requestContext.js
//
// Almacena el businessId de la request en curso sin tener que pasarlo a mano
// por cada función/handler — equivalente Node de flask.g en el proyecto de
// referencia SistemaEmpleados (core/tenant_db.py). AsyncLocalStorage sigue el
// contexto a través de awaits/callbacks dentro de la misma request.
const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

// Envuelve `fn` para que, durante su ejecución (incluida cualquier promesa
// que dispare dentro), getBusinessId() devuelva `businessId`.
const runWithBusinessId = (businessId, fn) => als.run({ businessId }, fn);

// undefined si se llama fuera de una request envuelta con runWithBusinessId
// (arranque de la app, scripts uno-a-uno, etc.) — nunca lanza.
const getBusinessId = () => als.getStore()?.businessId;

module.exports = { runWithBusinessId, getBusinessId };
