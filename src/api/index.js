const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
// Reescritura para que las rutas funcionen sin el prefijo /api si es necesario
server.use(jsonServer.rewriter({
  '/api/*': '/$1'
}));
server.use(router);

module.exports = server;