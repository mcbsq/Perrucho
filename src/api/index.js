// server.js — JSON Server para desarrollo local
// FIX: PATCH ahora incluido en Access-Control-Allow-Methods
// Para correr: npm run server  (o  node server.js)
// Endpoint base: http://localhost:3001

const jsonServer = require('json-server');
const path       = require('path');

const server      = jsonServer.create();
const router      = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// ── CORS — debe ir ANTES de middlewares y router ──────────────────────────────
// json-server/express no incluye PATCH en los defaults, por eso el preflight falla.
server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    // Responder el preflight OPTIONS inmediatamente, sin pasar al router
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

server.use(middlewares);
server.use(router);

const port = process.env.PORT || 3001;
server.listen(port, () => {
    console.log(`\n🐾 Perrucho JSON Server corriendo en http://localhost:${port}`);
    console.log(`   Métodos permitidos: GET POST PUT PATCH DELETE`);
    console.log(`   GET /clients      → clientes`);
    console.log(`   GET /pets         → mascotas`);
    console.log(`   GET /services     → servicios`);
    console.log(`   GET /products     → inventario`);
    console.log(`   GET /appointments → citas`);
    console.log(`   GET /sales        → ventas`);
    console.log(`   GET /users        → usuarios\n`);
});

module.exports = server;