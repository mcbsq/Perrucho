// scripts/createTestBusiness.js
//
// Da de alta una empresa de pruebas con sus tres cuentas (administrador,
// empleado y cliente) usando los mismos endpoints públicos que usa la app —
// así pasa por AEGIS igual que un alta real y no hace falta .env local.
// Las contraseñas temporales las genera AEGIS y se imprimen UNA vez; cada
// cuenta debe cambiarla en su primer login.
//
// Uso: node scripts/createTestBusiness.js <baseUrl> <slug> <correoBase>
//   ej. node scripts/createTestBusiness.js https://perrucho.vercel.app pruebas-qa qa@cibercom.mx
//   → correos qa+pruebas-qa-admin@…, qa+pruebas-qa-empleado@…, qa+pruebas-qa-cliente@…

const [baseUrlArg, slug, baseEmail, giro = 'mascotas'] = process.argv.slice(2);
if (!baseUrlArg || !slug || !baseEmail || !baseEmail.includes('@')) {
  console.error('Uso: node scripts/createTestBusiness.js <baseUrl> <slug> <correoBase> [giro]');
  process.exit(1);
}

const baseUrl = baseUrlArg.replace(/\/+$/, '');
const [local, domain] = baseEmail.toLowerCase().split('@');
const emailFor = (tag) => `${local}+${slug}-${tag}@${domain}`;

const call = async (path, body, headers = {}) => {
  const r = await fetch(`${baseUrl}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}: ${JSON.stringify(data)}`);
  return data;
};

(async () => {
  const admin = await call('/business/register', {
    businessName: `Pruebas ${slug}`,
    slug,
    giro,
    adminName: 'Admin Pruebas',
    adminEmail: emailFor('admin'),
    logoUrl: `${baseUrl}/logo512.png`,
  });
  console.log(`Empresa creada: ${baseUrl}/${admin.slug}`);

  const empleado = await call(
    '/users',
    { name: 'Empleado Pruebas', email: emailFor('empleado'), role: 'empleado' },
    { Authorization: `Bearer ${admin.token}` },
  );

  const cliente = await call(
    '/signup',
    { name: 'Cliente Pruebas', email: emailFor('cliente') },
    { 'X-Business-Slug': admin.slug },
  );

  console.log('\nCuentas (contraseñas temporales — se cambian en el primer login):');
  console.table([
    { rol: 'administrador', email: admin.user.email, password: admin.tempPassword },
    { rol: 'empleado', email: empleado.email, password: empleado.tempPassword },
    { rol: 'cliente', email: cliente.user.email, password: cliente.tempPassword },
  ]);
})().catch((e) => {
  // "fetch failed" solo no dice nada — la causa real (DNS, TLS, timeout) viene en e.cause
  console.error(e.message, e.cause ? `(${e.cause.code || e.cause.message})` : '');
  process.exit(1);
});
