const jsonServer = require('json-server');
const path = require('path');
const server = jsonServer.create();

// IMPORTANTE: Vercel necesita que el router apunte correctamente al archivo
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

server.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

server.use(middlewares);

// Reescribir rutas para que /api/users se convierta en /users para el router interno
server.use(jsonServer.rewriter({
  "/api/*": "/$1"
}));

server.use(router);

// En Vercel, NO usamos server.listen() para producción, 
// solo lo exportamos. Pero mantenemos esto para tu desarrollo local.
if (process.env.NODE_ENV !== 'production') {
    const port = 3001;
    server.listen(port, () => {
        console.log(`🐾 Perrucho Local Server en http://localhost:${port}`);
    });
}

// ESTA ES LA CLAVE PARA VERCEL
module.exports = server;