-- Add a dynamic `stats` JSON array so the admin can add/remove logros freely.
-- The old statLabel1..4/statValue1..4 columns are intentionally left in place
-- (not dropped) because the currently-deployed production site still reads
-- them — dropping now would break perrucho.vercel.app before the matching
-- code is deployed. They can be dropped in a follow-up migration once the
-- new code ships.
ALTER TABLE "Settings" ADD COLUMN "stats" JSONB NOT NULL DEFAULT '[{"value":"4000+","label":"CLIENTES FELICES","icon":"😊"},{"value":"5★","label":"CALIFICACIÓN","icon":"⭐"},{"value":"3","label":"ESPECIALISTAS","icon":"👨‍⚕️"},{"value":"10+","label":"AÑOS DE EXPERIENCIA","icon":"🏆"}]';
