-- Migration 008: Fix circles table - add missing columns
-- Add area and perimeter columns to circles table (was missing from migration 007)
ALTER TABLE circles ADD COLUMN IF NOT EXISTS area_sq_km DECIMAL(10, 2);
ALTER TABLE circles ADD COLUMN IF NOT EXISTS perimeter_km DECIMAL(10, 2);

-- Add created_by column to circles table (required by API)
ALTER TABLE circles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 008: Circles table fixed - added area_sq_km, perimeter_km, and created_by columns';
END $$;
