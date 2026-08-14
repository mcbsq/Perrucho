// scripts/createSuperAdmin.js
//
// Crea (o rota la contraseña de) la cuenta maestra de la plataforma —
// businessId null, role 'superadmin', auth local (bcrypt, no AEGIS: es una
// sola cuenta, no vale la pena atarla al mismo proveedor externo que ya
// causó el incidente de Resend/AEGIS con Taylor's). La contraseña se genera
// aquí y se imprime UNA vez — no se guarda en ningún lado más que el hash.
//
// Uso: node scripts/createSuperAdmin.js <email> <nombre>
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../api/lib/prismaRaw');

const genPassword = () => crypto.randomBytes(18).toString('base64').replace(/[+/=]/g, '');

(async () => {
  const [email, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(' ');
  if (!email || !name) {
    console.error('Uso: node scripts/createSuperAdmin.js <email> <nombre>');
    process.exit(1);
  }

  const password = genPassword();
  const hash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
  let user;
  if (existing) {
    if (existing.role !== 'superadmin') {
      console.error(`Ya existe un usuario con ese correo (id ${existing.id}, businessId ${existing.businessId}, role ${existing.role}) que NO es superadmin — aborta para no pisarlo.`);
      process.exit(1);
    }
    user = await prisma.user.update({ where: { id: existing.id }, data: { password: hash } });
    console.log(`Contraseña rotada para superadmin existente (id ${user.id}).`);
  } else {
    user = await prisma.user.create({
      data: { email: email.toLowerCase(), name, password: hash, role: 'superadmin', businessId: null },
    });
    console.log(`Superadmin creado (id ${user.id}).`);
  }

  console.log('Email:', user.email);
  console.log('Contraseña temporal (guárdala, no se vuelve a mostrar):', password);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
