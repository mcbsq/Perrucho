// scripts/migrateBusinessToAegis.js
//
// Cutover explícito de un negocio de contraseña local a AEGIS (ver plan de
// Fase 4). Para cada usuario del negocio que todavía no tenga aegisUserId:
//   1. Crea su identidad en AEGIS (adminCreateUser) — genera contraseña temporal.
//   2. Guarda aegisUserId localmente y borra el password local (bcrypt).
//   3. Le manda un correo avisándole su contraseña temporal (api/lib/mailer.js).
// Solo al final, si TODOS los usuarios se migraron sin error, voltea
// Business.authProvider a "aegis". Si algo falla a medio camino, el script
// es seguro de volver a correr — salta a los usuarios que ya tengan
// aegisUserId (idempotente), así que se puede reintentar sin duplicar nada.
//
// Uso: node scripts/migrateBusinessToAegis.js <slug> [--dry-run]
require('dotenv').config();
const prisma = require('../api/lib/prismaRaw');
const aegisClient = require('../api/lib/aegisClient');
const { sendAegisMigrationEmail } = require('../api/lib/mailer');

async function main() {
  const slug = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');
  if (!slug) {
    console.error('Uso: node scripts/migrateBusinessToAegis.js <slug> [--dry-run]');
    process.exit(1);
  }

  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) {
    console.error(`No existe ningún negocio con slug "${slug}".`);
    process.exit(1);
  }
  if (business.authProvider === 'aegis') {
    console.log(`"${business.name}" ya está en modo AEGIS — nada que hacer.`);
    process.exit(0);
  }

  const users = await prisma.user.findMany({ where: { businessId: business.id } });
  const pending = users.filter((u) => !u.aegisUserId);
  const alreadyDone = users.length - pending.length;

  console.log(`Negocio: ${business.name} (${slug})`);
  console.log(`Usuarios totales: ${users.length} — ya migrados: ${alreadyDone} — pendientes: ${pending.length}`);
  if (dryRun) {
    console.log('--dry-run: no se hace ningún cambio ni se manda correo. Usuarios que se migrarían:');
    pending.forEach((u) => console.log(`  - ${u.email} (${u.role})`));
    process.exit(0);
  }

  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${slug}/acceso`;
  let failures = 0;

  for (const user of pending) {
    const aegisRole = ['administrador', 'empleado'].includes(user.role) ? user.role : 'cliente';
    const { data, error } = await aegisClient.adminCreateUser(user.email, aegisRole);
    if (error) {
      failures++;
      console.error(`  ✗ ${user.email}: ${JSON.stringify(error.body)} (HTTP ${error.status})`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { aegisUserId: String(data.id), password: null },
    });

    const { sent } = await sendAegisMigrationEmail({
      to: user.email,
      name: user.name,
      businessName: business.name,
      tempPassword: data.tempPassword,
      loginUrl,
    });

    console.log(`  ✓ ${user.email} — identidad creada${sent ? ', correo enviado' : ' (correo NO enviado, revisa RESEND_API_KEY)'}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} usuario(s) fallaron — el negocio SIGUE en modo "local". Corrige y vuelve a correr el script (es seguro, salta a los ya migrados).`);
    process.exit(1);
  }

  await prisma.business.update({ where: { id: business.id }, data: { authProvider: 'aegis' } });
  console.log(`\nTodos los usuarios migrados. "${business.name}" ahora está en modo AEGIS.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
