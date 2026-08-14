// middleware/tenant.js
//
// Resuelve a qué negocio (Business) pertenece la request en curso y lo deja
// disponible como req.businessId / req.business, además de envolver el resto
// de la cadena de middlewares en el contexto de api/lib/requestContext.js
// para que api/lib/tenantClient.js pueda filtrar automáticamente cada query.
//
// Prioridad de resolución (ver plan de Fase 2):
//   1. Request autenticado — el JWT ya trae businessId (ver middleware/auth.js
//      y signToken en api/index.js). No hace falta ir a la base de datos.
//   2. Request pública con slug — header X-Business-Slug, mandado por el
//      frontend (BusinessContext, Fase 3). Se resuelve contra Business vía
//      prismaRaw (el propio lookup del slug no puede pasar por tenantClient:
//      todavía no sabemos el businessId).
//   3. Nada de lo anterior — DEFAULT_BUSINESS_ID (Taylor's, id 1) mientras el
//      frontend todavía no manda el slug (Fase 2 se despliega antes que la
//      Fase 3) — así ninguna ruta existente se rompe durante la transición.
const prismaRaw = require('../api/lib/prismaRaw');
const { runWithBusinessId } = require('../api/lib/requestContext');

const DEFAULT_BUSINESS_ID = Number(process.env.DEFAULT_BUSINESS_ID || 1);

const resolveBusiness = async (req, res, next) => {
  try {
    let businessId = null;

    if (req.user && req.user.businessId != null) {
      businessId = req.user.businessId;
    } else {
      const slug = req.headers['x-business-slug'];
      if (slug) {
        const business = await prismaRaw.business.findUnique({ where: { slug: String(slug) } });
        if (!business || !business.isActive) {
          return res.status(404).json({ error: 'Negocio no encontrado' });
        }
        businessId = business.id;
        req.business = business;
      }
    }

    if (businessId == null) businessId = DEFAULT_BUSINESS_ID;

    req.businessId = businessId;
    runWithBusinessId(businessId, next);
  } catch (err) {
    console.error('resolveBusiness', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};

module.exports = { resolveBusiness };
