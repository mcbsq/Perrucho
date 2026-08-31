const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldStartStandaloneServer, shouldServeStaticApp } = require('./runtime');

test('Docker inicia el servidor aunque NODE_ENV sea production', () => {
  assert.equal(shouldStartStandaloneServer({ NODE_ENV: 'production' }), true);
});

test('Vercel no abre un listener HTTP propio', () => {
  assert.equal(shouldStartStandaloneServer({ VERCEL: '1', NODE_ENV: 'production' }), false);
});

test('solo sirve el build de React cuando se solicita explícitamente', () => {
  assert.equal(shouldServeStaticApp({ SERVE_STATIC: 'true' }), true);
  assert.equal(shouldServeStaticApp({}), false);
});
