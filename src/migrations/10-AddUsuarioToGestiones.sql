-- Agregar columna usuario a la tabla gestiones
ALTER TABLE gestiones ADD COLUMN IF NOT EXISTS usuario VARCHAR;
