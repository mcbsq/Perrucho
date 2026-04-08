const jsonServer = require('json-server');
const path = require('path');
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);

// Opcional: Prefijo para que no choque con las rutas de React
server.use(jsonServer.rewriter({
  '/api/*': '/$1'
}));

server.use(router);

// IMPORTANTE: Para Vercel, no uses server.listen() aquí directamente, 
// o envuélvelo en un condicional para que solo corra en local.
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3001;
  server.listen(port, () => {
    console.log(`JSON Server is running on port ${port}`);
  });
}

module.exports = server;