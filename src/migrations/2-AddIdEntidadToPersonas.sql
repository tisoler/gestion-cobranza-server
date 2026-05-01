ALTER TABLE "personas" ADD COLUMN IF NOT EXISTS "idEntidad" integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FK_personas_entidad'
  ) THEN
    ALTER TABLE "personas"
      ADD CONSTRAINT "FK_personas_entidad"
      FOREIGN KEY ("idEntidad") REFERENCES "entidades"("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_personas_idEntidad" ON "personas" ("idEntidad");
