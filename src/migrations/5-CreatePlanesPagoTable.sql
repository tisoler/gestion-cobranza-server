CREATE TABLE "planes_pago" (
  "id" SERIAL PRIMARY KEY,
  "nombre" text NOT NULL,
  "producto" text NOT NULL,
  "numero_cuotas" integer NOT NULL,
  "id_entidad" integer,
  "descuento_intereses" double precision NOT NULL,
  "porcentaje_anticipo" double precision NOT NULL,
  "activo" boolean NOT NULL DEFAULT true
);
