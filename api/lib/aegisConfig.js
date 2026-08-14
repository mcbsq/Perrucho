// api/lib/aegisConfig.js
//
// Puerto a JS de core/aegis_config.py (SistemaEmpleados) — lee variables de
// entorno y decide si este backend debe usar AEGIS para login y/o para
// crear/resetear contraseñas (Admin API). El resto del código no repite la
// lógica de "¿hay URL? ¿hay API key?": solo consulta getAegisSettings().
//
// A diferencia de SistemaEmpleados (un tenant de AEGIS por empresa cliente),
// Perrucho usa UN SOLO tenant de AEGIS ("perrucho") compartido por todos los
// negocios de la plataforma — la separación por negocio la sigue haciendo
// Perrucho internamente (businessId), AEGIS solo confirma la identidad.
// Por eso aquí no hace falta resolve-tenant dinámico: tenantId/appId son
// estáticos, tomados directo del entorno.
const _truthy = (value, fallback = false) => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const getAegisSettings = () => {
  const baseUrl = (process.env.AEGIS_BASE_URL || '').trim().replace(/\/$/, '');
  const tenantId = (process.env.AEGIS_TENANT_ID || '').trim();
  const appId = (process.env.AEGIS_APP_ID || '').trim();
  const apiKey = (process.env.AEGIS_API_KEY || '').trim();
  const timeout = Number(process.env.AEGIS_TIMEOUT || 15000);
  const explicitOff = _truthy(process.env.AEGIS_DISABLED, false);

  const loginEnabled = Boolean(baseUrl && tenantId && appId) && !explicitOff;
  const adminEnabled = loginEnabled && Boolean(apiKey);

  return { baseUrl, tenantId, appId, apiKey, timeout, loginEnabled, adminEnabled };
};

module.exports = { getAegisSettings };
