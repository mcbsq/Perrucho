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

if (!global.prismaRaw) {
  global.prismaRaw = new PrismaClient();
}

module.exports = global.prismaRaw;
