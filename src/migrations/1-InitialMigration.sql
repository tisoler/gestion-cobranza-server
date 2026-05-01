-- TABLAS PRINCIPALES
CREATE TABLE "entidades" (
  "id" SERIAL PRIMARY KEY, 
  "nombre" text NOT NULL, 
  "activo" boolean NOT NULL DEFAULT true
);

CREATE TABLE "personas" (
  "id" SERIAL PRIMARY KEY, 
  "dni" text, 
  "cuit" text, 
  "nombre" text NOT NULL, 
  "apellido" text NOT NULL, 
  "telefono" text, 
  "email" text
);

-- TABLAS DE BIENES (RELACIONADAS CON PERSONA)
CREATE TABLE "tgi_urbano" (
  "id" SERIAL PRIMARY KEY, 
  "idPersona" integer NOT NULL, 
  "domicilio" text NOT NULL, 
  "numero_padron" text NOT NULL, 
  "codigo_web" text NOT NULL, 
  "direccion_padron" text NOT NULL, 
  "sup_terreno" double precision NOT NULL, 
  "mts_frente" double precision NOT NULL
);

CREATE TABLE "tgi_rural" (
  "id" SERIAL PRIMARY KEY, 
  "idPersona" integer NOT NULL, 
  "domicilio" text NOT NULL, 
  "numero_padron" text NOT NULL, 
  "codigo_web" text NOT NULL, 
  "direccion_padron" text NOT NULL, 
  "sup_campo" double precision NOT NULL
);

CREATE TABLE "patentes" (
  "id" SERIAL PRIMARY KEY, 
  "idPersona" integer NOT NULL, 
  "domicilio" text NOT NULL, 
  "numero_patente" text NOT NULL, 
  "marca" text NOT NULL, 
  "modelo" text NOT NULL, 
  "tipo" text NOT NULL
);

-- TABLA DE GESTIONES
CREATE TABLE "gestiones" (
  "id" SERIAL PRIMARY KEY, 
  "idPersona" integer NOT NULL, 
  "fecha_hora" TIMESTAMP NOT NULL DEFAULT now(), 
  "accion" text NOT NULL, 
  "contacto" text NOT NULL, 
  "observaciones" text
);

-- FOREIGN KEYS
ALTER TABLE "tgi_urbano" ADD CONSTRAINT "FK_tgi_urbano_persona" FOREIGN KEY ("idPersona") REFERENCES "personas"("id");
ALTER TABLE "tgi_rural" ADD CONSTRAINT "FK_tgi_rural_persona" FOREIGN KEY ("idPersona") REFERENCES "personas"("id");
ALTER TABLE "patentes" ADD CONSTRAINT "FK_patentes_persona" FOREIGN KEY ("idPersona") REFERENCES "personas"("id");
ALTER TABLE "gestiones" ADD CONSTRAINT "FK_gestiones_persona" FOREIGN KEY ("idPersona") REFERENCES "personas"("id");


-- TABLAS DE CUOTAS
CREATE TABLE "cuotas_tgi_urbano" (
  "id" SERIAL PRIMARY KEY,
  "idTgiUrbano" integer NOT NULL,
  "numero_cuota" integer NOT NULL,
  "cantidad_cuotas" integer NOT NULL,
  "capital" double precision NOT NULL,
  "intereses" double precision NOT NULL,
  "vencimiento" date NOT NULL,
  CONSTRAINT "FK_cuotas_tgi_urbano" FOREIGN KEY ("idTgiUrbano") REFERENCES "tgi_urbano"("id") ON DELETE CASCADE
);
CREATE TABLE "cuotas_tgi_rural" (
  "id" SERIAL PRIMARY KEY,
  "idTgiRural" integer NOT NULL,
  "numero_cuota" integer NOT NULL,
  "cantidad_cuotas" integer NOT NULL,
  "capital" double precision NOT NULL,
  "intereses" double precision NOT NULL,
  "vencimiento" date NOT NULL,
  CONSTRAINT "FK_cuotas_tgi_rural" FOREIGN KEY ("idTgiRural") REFERENCES "tgi_rural"("id") ON DELETE CASCADE
);
CREATE TABLE "cuotas_patentes" (
  "id" SERIAL PRIMARY KEY,
  "idPatente" integer NOT NULL,
  "numero_cuota" integer NOT NULL,
  "cantidad_cuotas" integer NOT NULL,
  "capital" double precision NOT NULL,
  "intereses" double precision NOT NULL,
  "vencimiento" date NOT NULL,
  CONSTRAINT "FK_cuotas_patentes" FOREIGN KEY ("idPatente") REFERENCES "patentes"("id") ON DELETE CASCADE
);
