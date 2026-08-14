// api/lib/mailer.js
//
// Correo saliente del sistema (avisos, no autoservicio de recuperación de
// contraseña — eso lo maneja AEGIS/la pregunta de seguridad, nunca correo).
// Mismo patrón que PastranaEvents/server/mailer.js: Resend, remitente
// compartido onboarding@resend.dev mientras no haya dominio propio
// verificado — cuando lo haya, solo cambia RESEND_FROM_EMAIL, sin tocar código.
// Si no hay RESEND_API_KEY configurada, no falla nada más: solo no manda el
// correo y lo deja loggeado — nunca debe bloquear la operación que lo disparó.
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || 'Perrucho <onboarding@resend.dev>';

const escapeHtml = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Envoltorio genérico — reutilizable para cualquier aviso futuro del sistema
// (no solo la migración a AEGIS), sin tener que repetir la lógica de
// "¿está configurado Resend?" en cada sitio nuevo que quiera mandar correo.
const sendMail = async ({ to, subject, html }) => {
  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY no configurada — no se envió correo a', to);
    return { sent: false };
  }
  try {
    // El SDK de Resend NO lanza excepción en errores de la API (dominio no
    // verificado, rate limit, etc.) — regresa { data, error } y hay que
    // revisar `error` a mano. No hacerlo fue el bug real: se reportaba
    // "enviado" aunque Resend hubiera rechazado el correo.
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('[mailer] Resend rechazó el correo a', to, '—', error.message || error);
      return { sent: false, error };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error('[mailer] Error enviando correo:', err);
    return { sent: false, error: err };
  }
};

const layout = (businessName, title, bodyHtml) => `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
    <h2 style="margin:0 0 4px;">${escapeHtml(title)}</h2>
    <p style="color:#888; margin:0 0 20px; font-size:13px;">${escapeHtml(businessName)}</p>
    ${bodyHtml}
    <p style="margin-top:24px; font-size:12px; color:#888;">
      Este es un aviso automático de Perrucho. Si no reconoces esta cuenta, ignora este correo.
    </p>
  </div>
`;

// Aviso de migración a AEGIS: se manda una sola vez por usuario, en el
// momento en que su negocio pasa de contraseña local a AEGIS — sin esto, la
// persona no tiene forma de saber cuál es su nueva contraseña temporal.
const sendAegisMigrationEmail = async ({ to, name, businessName, tempPassword, loginUrl }) => {
  const html = layout(businessName, 'Tu contraseña cambió', `
    <p>Hola ${escapeHtml(name)},</p>
    <p>Actualizamos la forma en que ${escapeHtml(businessName)} gestiona el acceso al sistema. Tu cuenta sigue igual, pero necesitas una contraseña nueva para entrar:</p>
    <p style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; background: #f4f4f5; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 12px 16px; text-align: center;">
      ${escapeHtml(tempPassword)}
    </p>
    <p>Es temporal — el sistema te pedirá cambiarla por una tuya la primera vez que entres.</p>
    <p><a href="${loginUrl}" style="display:inline-block; background:#4f46e5; color:#fff; text-decoration:none; padding:10px 20px; border-radius:8px; font-weight:600;">Entrar y cambiar mi contraseña</a></p>
  `);
  return sendMail({ to, subject: `${businessName} — tu contraseña de acceso cambió`, html });
};

module.exports = { sendMail, sendAegisMigrationEmail };
