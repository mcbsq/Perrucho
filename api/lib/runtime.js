// Diferencia Vercel (que invoca el handler) de una ejecución Node normal
// como Docker, donde este proceso sí debe abrir su propio puerto HTTP.
const shouldStartStandaloneServer = (env = {}) => !env.VERCEL;

// En Docker Express sirve el build de React desde el mismo origen que la API.
// En Vercel esa responsabilidad sigue siendo de su static build separado.
const shouldServeStaticApp = (env = {}) => env.SERVE_STATIC === 'true';

module.exports = { shouldStartStandaloneServer, shouldServeStaticApp };
