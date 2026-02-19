-- Migration: Add EXIF metadata processing columns to images table
-- Created: 2026-02-19
-- Description: Adds metadata_status tracking, geo-consistency result columns, and
--              exif_camera_serial for Task 3.1.3 (Image Metadata Extraction Pipeline).
--              Also adds a GIN index for efficient JSONB metadata queries.

-- Task 3.1.3.9: metadata JSONB column already exists from migration 005.
--              These columns support the full processing pipeline.

ALTER TABLE images
ADD COLUMN IF NOT EXISTS metadata_status VARCHAR(20) DEFAULT 'pending'
    CHECK (metadata_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS metadata_processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS geo_consistent BOOLEAN,
ADD COLUMN IF NOT EXISTS geo_distance_m FLOAT,           -- Distance in metres between EXIF GPS and registered camera latitude/longitude
ADD COLUMN IF NOT EXISTS exif_camera_serial TEXT;        -- Serial number extracted from EXIF (used for camera binding, Task 3.1.3.7)

-- GIN index for efficient jsonb queries on full metadata column (Task 3.1.3.9)
CREATE INDEX IF NOT EXISTS idx_images_metadata_gin     ON images USING GIN (metadata jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_images_metadata_status  ON images(metadata_status);

-- Backfill: images that were already processed (status='processed', non-empty metadata)
-- should not be reprocessed by the background worker.
UPDATE images
SET metadata_status = 'completed'
WHERE status = 'processed'
  AND metadata IS NOT NULL
  AND metadata != '{}'::jsonb
  AND metadata_status IS NULL;

DO $$
BEGIN
  RAISE NOTICE 'Migration 010: Added EXIF metadata processing columns (metadata_status, geo_consistent, geo_distance_m, exif_camera_serial) to images table.';
END $$;
