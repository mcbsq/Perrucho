// api/mailer.js
//
// Envío de correo real para "Olvidé mi contraseña" — a diferencia de
// src/utils/emailNotify.js (que abre mailto: en el cliente del empleado),
// este envío ocurre en el servidor porque el cliente que olvidó su
// contraseña no tiene sesión para abrir su propio cliente de correo.
//
// Requiere configurar SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (ver
// .env.example) — con cualquier proveedor SMTP (Gmail con contraseña de
// aplicación, SendGrid, Resend, etc). Si no está configurado, no se rompe
// nada: se loggea una advertencia y el endpoint sigue respondiendo OK
// (para no filtrar por temporización/error si un email existe o no).

const nodemailer = require('nodemailer');

let transporter = null;
const isConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] SMTP no configurado — no se pudo enviar el correo de recuperación. Configura SMTP_HOST/SMTP_USER/SMTP_PASS.');
    return false;
  }
  await t.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Recupera tu contraseña',
    text: `Hola ${name || ''},\n\nRecibimos una solicitud para restablecer tu contraseña. Este enlace es válido por 1 hora:\n\n${resetUrl}\n\nSi no fuiste tú, ignora este correo.`,
    html: `<p>Hola ${name || ''},</p><p>Recibimos una solicitud para restablecer tu contraseña. Este enlace es válido por 1 hora:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si no fuiste tú, ignora este correo.</p>`,
  });
  return true;
}

module.exports = { sendPasswordResetEmail, isConfigured };
