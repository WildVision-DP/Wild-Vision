-- Migration 009: Add created_by to divisions, ranges, and beats tables
-- Add created_by column to divisions, ranges, and beats (matching circles table)
ALTER TABLE divisions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE ranges ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 009: Added created_by columns to divisions, ranges, and beats tables';
END $$;
