-- Migración para ampliar los datos de las personas
-- 1. Renombrar dni a nro_doc
ALTER TABLE personas RENAME COLUMN dni TO nro_doc;

-- 2. Agregar nuevas columnas
ALTER TABLE personas ADD COLUMN IF NOT EXISTS tipo_doc VARCHAR(20) DEFAULT 'DNI';
ALTER TABLE personas ADD COLUMN IF NOT EXISTS apellido_nombre VARCHAR(255);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS calle_domicilio VARCHAR(255);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS numero_domicilio VARCHAR(50);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS piso_domicilio VARCHAR(20);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS depto_domicilio VARCHAR(20);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS localidad VARCHAR(255);
ALTER TABLE personas ADD COLUMN IF NOT EXISTS provincia VARCHAR(255);
