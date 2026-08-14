// scripts/registerDemoBusinesses.js
//
// Da de alta negocios de ejemplo contra el API (por defecto el local,
// localhost:3001) llamando el mismo endpoint que usa el alta self-service
// desde /crear-negocio — así se prueban la ruta con giro (/:giro/:slug), el
// preset del giro y AEGIS igual que un registro real, sin tener que subir
// un logo a mano en el navegador (usa el ícono genérico de la marca como
// placeholder, reemplázalo desde Personalización una vez adentro).
//
// Uso: node scripts/registerDemoBusinesses.js [API_BASE]
const fs = require('fs');
const path = require('path');

const API_BASE = process.argv[2] || 'http://localhost:3001/api';

const svg = fs.readFileSync(path.join(__dirname, '../src/assets/perrucho-mark.svg'), 'utf8');
const logoUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

const BUSINESSES = [
  { businessName: 'Emporio Uñas', slug: 'emporio-unas', giro: 'unas', adminName: 'Admin Uñas', adminEmail: 'admin@emporio-unas.demo' },
  { businessName: 'Emporio Pestañas', slug: 'emporio-pestanas', giro: 'pestanas', adminName: 'Admin Pestañas', adminEmail: 'admin@emporio-pestanas.demo' },
];

(async () => {
  for (const b of BUSINESSES) {
    const res = await fetch(`${API_BASE}/business/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...b, logoUrl }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error(`FALLÓ ${b.slug}:`, res.status, body);
      continue;
    }
    console.log(`OK ${b.businessName} → /${b.giro}/${body.slug} — temp password: ${body.tempPassword} — admin: ${b.adminEmail}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
