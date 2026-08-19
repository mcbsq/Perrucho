-- Los defaults de Settings eran literalmente el WhatsApp/dirección/redes/
-- estadísticas/copy REALES de Taylor's — cualquier negocio nuevo que no
-- llenara estos campos los heredaba (bug real, visto en Emporio Uñas y
-- Emporio Pestañas). Solo cambia el DEFAULT de la columna (metadata) — no
-- toca ninguna fila existente, así que Taylor's queda exactamente igual.
ALTER TABLE "Settings" ALTER COLUMN "whatsappNumber" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "businessAddress" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "businessMapsUrl" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "instagramUrl" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "facebookUrl" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "tiktokUrl" SET DEFAULT '';
ALTER TABLE "Settings" ALTER COLUMN "businessName" SET DEFAULT 'Mi negocio';
ALTER TABLE "Settings" ALTER COLUMN "slogan" SET DEFAULT 'Reserva tu cita en minutos';
ALTER TABLE "Settings" ALTER COLUMN "stats" SET DEFAULT '[]';
ALTER TABLE "Settings" ALTER COLUMN "whyUsSubtitle" SET DEFAULT 'Comprometidos con darte un servicio profesional, puntual y de calidad.';
ALTER TABLE "Settings" ALTER COLUMN "whyUsFeatures" SET DEFAULT '[{"icon":"⭐","title":"Calidad garantizada","desc":"Servicio profesional con atención al detalle en cada cita."},{"icon":"📅","title":"Agenda en línea","desc":"Reserva tu cita en segundos desde cualquier dispositivo. Fácil y sin complicaciones."},{"icon":"👥","title":"Equipo capacitado","desc":"Personal en constante formación para brindarte el mejor servicio."},{"icon":"💳","title":"Pago sencillo","desc":"Cobra y recibe tu recibo al instante, sin complicaciones."}]';
