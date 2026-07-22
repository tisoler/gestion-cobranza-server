-- Agregar columnas manzana y sup_hectarea a tgi_rural
ALTER TABLE tgi_rural ADD COLUMN IF NOT EXISTS manzana VARCHAR;
ALTER TABLE tgi_rural ADD COLUMN IF NOT EXISTS sup_hectarea DOUBLE PRECISION;
