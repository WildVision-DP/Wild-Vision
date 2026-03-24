-- Migration: Add Thumbnail and AI columns to Images table
-- Created: 2026-02-13
-- Description: Adds columns for hosting thumbnails and storing AI analysis results

ALTER TABLE images 
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence FLOAT, -- 0.0 to 1.0 confidence score
ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'flagged')),
ADD COLUMN IF NOT EXISTS ai_labels JSONB DEFAULT '{}'::jsonb; -- Store detected objects/classes

-- Index for review workflow
CREATE INDEX IF NOT EXISTS idx_images_review_status ON images(review_status);
CREATE INDEX IF NOT EXISTS idx_images_ai_confidence ON images(ai_confidence);

DO $$
BEGIN
  RAISE NOTICE 'Migration 006: Added thumbnail_path and AI columns to images table';
END $$;
