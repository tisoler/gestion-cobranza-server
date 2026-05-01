-- Historial de teléfonos y correos: orden [más reciente, ..., más antiguo].
-- persona.telefono / persona.email siguen reflejando el actual (índice 0) para búsquedas y compatibilidad.

ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "lista_telefonos" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "lista_emails" jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE "personas"
SET "lista_telefonos" = to_jsonb(ARRAY["telefono"::text])
WHERE "telefono" IS NOT NULL AND btrim("telefono") <> ''
  AND "lista_telefonos" = '[]'::jsonb;

UPDATE "personas"
SET "lista_emails" = to_jsonb(ARRAY["email"::text])
WHERE "email" IS NOT NULL AND btrim("email") <> ''
  AND "lista_emails" = '[]'::jsonb;
