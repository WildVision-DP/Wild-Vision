-- Migration 007: Add area and perimeter columns to geography tables
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS area_sq_km DECIMAL(10, 2);
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS perimeter_km DECIMAL(10, 2);

ALTER TABLE ranges ADD COLUMN IF NOT EXISTS area_sq_km DECIMAL(10, 2);
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS perimeter_km DECIMAL(10, 2);

ALTER TABLE beats ADD COLUMN IF NOT EXISTS area_sq_km DECIMAL(10, 2);
ALTER TABLE beats ADD COLUMN IF NOT EXISTS perimeter_km DECIMAL(10, 2);
