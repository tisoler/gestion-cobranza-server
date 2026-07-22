CREATE TABLE "notificaciones" (
  "id" SERIAL PRIMARY KEY,
  "id_destinatario" text NOT NULL,
  "id_emisor" text NOT NULL,
  "email_emisor" text,
  "id_entidad" integer NOT NULL,
  "id_gestion" integer,
  "id_persona" integer NOT NULL,
  "persona_nombre" text,
  "mensaje" text NOT NULL,
  "leida" boolean NOT NULL DEFAULT false,
  "fecha_creacion" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX "idx_notificaciones_destinatario_leida"
  ON "notificaciones" ("id_destinatario", "leida");

CREATE INDEX "idx_notificaciones_destinatario_fecha"
  ON "notificaciones" ("id_destinatario", "fecha_creacion" DESC);
