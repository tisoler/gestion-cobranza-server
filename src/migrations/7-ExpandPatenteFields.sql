-- Migración: Agregar campos tramo y marca_modelo a la tabla patentes

-- 1. Agregar columna tramo
ALTER TABLE patentes ADD COLUMN IF NOT EXISTS tramo VARCHAR(255);

-- 2. Agregar columna marca_modelo
ALTER TABLE patentes ADD COLUMN IF NOT EXISTS marca_modelo VARCHAR(255);

-- 3. (Opcional) Poblar marca_modelo con los datos existentes
UPDATE patentes SET marca_modelo = CONCAT(marca, ' ', modelo)
WHERE marca_modelo IS NULL AND marca IS NOT NULL AND modelo IS NOT NULL;
