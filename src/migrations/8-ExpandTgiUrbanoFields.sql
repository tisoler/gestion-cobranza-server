-- Agregar columna tramo a cuotas_tgi_urbano
ALTER TABLE cuotas_tgi_urbano ADD COLUMN IF NOT EXISTS tramo VARCHAR;

-- Agregar columna manzana a tgi_urbano
ALTER TABLE tgi_urbano ADD COLUMN IF NOT EXISTS manzana VARCHAR;
