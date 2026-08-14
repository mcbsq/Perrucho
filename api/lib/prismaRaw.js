// api/lib/prismaRaw.js
//
// Cliente Prisma SIN aislamiento multi-tenant — escape hatch deliberado,
// equivalente a `mongo.db.raw` en SistemaEmpleados (core/tenant_db.py).
// Úsalo solo para lo que legítimamente cruza negocios:
//   1. Resolver el negocio a partir del slug de la URL (por definición, antes
//      de saber el businessId no se puede filtrar por él).
//   2. Scripts de migración/backfill uno-a-uno.
//   3. Herramientas internas de Cibercom que deliberadamente ven todos los
//      negocios a la vez.
// Cualquier otro uso es casi seguro un bug de aislamiento — pensarlo dos
// veces antes de importar este archivo en una ruta nueva.
const { PrismaClient } = require('@prisma/client');

// Deploys de Preview (rama `test`) usan una base de datos de Neon separada
// de producción, para poder probar cosas sin arriesgar los datos reales de
// Taylor's. La integración nativa Vercel↔Neon solo deja un branch por
// entorno vía su propio flujo (más fricción de la que vale la pena acá) —
// en su lugar, el proyecto de Vercel tiene AMBOS pares de credenciales
// (producción + test, bajo nombres distintos: TEST_POSTGRES_*) y esto
// decide cuál usar según VERCEL_ENV (variable que Vercel setea solo,
// 'production' | 'preview' | 'development') antes de que Prisma se
// conecte. Local: no hace nada — VERCEL_ENV no existe fuera de Vercel.
if (process.env.VERCEL_ENV === 'preview' && process.env.TEST_POSTGRES_PRISMA_URL) {
  process.env.POSTGRES_PRISMA_URL = process.env.TEST_POSTGRES_PRISMA_URL;
  process.env.POSTGRES_URL_NON_POOLING = process.env.TEST_POSTGRES_URL_NON_POOLING;
}

if (!global.prismaRaw) {
  global.prismaRaw = new PrismaClient();
}

module.exports = global.prismaRaw;
