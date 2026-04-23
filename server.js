// server.js — Backend JSON Server
// Local:      npm run server  →  http://localhost:3001
// Producción: Railway         →  https://tu-app.up.railway.app
//
// Railway asigna process.env.PORT automáticamente.
// El db.json persiste en Railway porque usa un volumen de disco.

const jsonServer = require('json-server');
const path       = require('path');

const server      = jsonServer.create();
const router      = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// ── CORS — antes de todo lo demás ────────────────────────────────────────────
server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

server.use(middlewares);
server.use(router);

// Siempre escuchar — Railway usa PORT, local usa 3001
const port = process.env.PORT || 3001;
server.listen(port, () => {
    console.log(`🐾 Perrucho Server corriendo en puerto ${port}`);
    console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Métodos: GET POST PUT PATCH DELETE`);
});

module.exports = server;