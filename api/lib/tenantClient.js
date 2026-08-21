// api/lib/tenantClient.js
//
// Cliente Prisma con aislamiento multi-tenant automático — equivalente al
// wrapper de Mongo de SistemaEmpleados (core/tenant_db.py), pero implementado
// como Prisma Client Extension ($extends) porque aquí el motor es Postgres,
// no Mongo. Cada query sobre un modelo "de negocio" (ver TENANT_MODELS) gana
// automáticamente `businessId` en su `where`/`data`, leído del contexto de la
// request en curso (api/lib/requestContext.js) — así ninguno de los 30+
// handlers de api/index.js tiene que acordarse de filtrar a mano; un filtro
// olvidado ahí sería una fuga de datos entre negocios.
//
// Si no hay businessId en contexto (nadie llamó runWithBusinessId todavía),
// se lanza un error en vez de dejar pasar la query sin filtrar — silenciar
// esto sería exactamente el bug que este archivo existe para prevenir. El
// único escape intencional es api/lib/prismaRaw.js, usado explícitamente.
const prismaRaw = require('./prismaRaw');
const { getBusinessId } = require('./requestContext');

// Nombres de modelo tal como los expone Prisma en el callback de la
// extensión (PascalCase, igual que en schema.prisma).
const TENANT_MODELS = new Set([
  'User', 'Pet', 'Service', 'Product', 'Appointment', 'Expense', 'Sale', 'Settings', 'MembershipPlan',
]);

const OPS_WITH_WHERE = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow', 'findUnique', 'findUniqueOrThrow',
  'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany',
]);
const OPS_WITH_DATA = new Set(['create', 'createMany']);

const tenantClient = prismaRaw.$extends({
  name: 'tenantScoping',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) return query(args);

        const businessId = getBusinessId();
        if (businessId == null) {
          throw new Error(
            `tenantClient: falta businessId en el contexto de la request para ${model}.${operation}. ` +
            `¿Falta el middleware resolveBusiness en esta ruta, o esta query debería usar prismaRaw a propósito?`
          );
        }

        args = args || {};

        if (operation === 'upsert') {
          args.where = { ...(args.where || {}), businessId };
          args.create = { businessId, ...(args.create || {}) };
        } else if (OPS_WITH_WHERE.has(operation)) {
          args.where = { ...(args.where || {}), businessId };
        } else if (OPS_WITH_DATA.has(operation)) {
          if (operation === 'createMany' && Array.isArray(args.data)) {
            args.data = args.data.map((d) => ({ businessId, ...d }));
          } else if (args.data) {
            args.data = { businessId, ...args.data };
          }
        }

        return query(args);
      },
    },
  },
});

module.exports = tenantClient;
