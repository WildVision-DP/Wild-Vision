-- Migration: Create Images Table
-- Created: 2026-02-13
-- Description: Creates images table to store metadata for uploaded surveillance images

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
  
  -- File Details
  file_path TEXT NOT NULL, -- MinIO path: /division/range/camera-id/yyyy-mm-dd/uuid.jpg
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  
  -- Metadata
  taken_at TIMESTAMP, -- Extracted from EXIF
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb, -- Full EXIF data
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  
  -- Upload Info
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_images_camera_id ON images(camera_id);
CREATE INDEX idx_images_taken_at ON images(taken_at);
CREATE INDEX idx_images_uploaded_at ON images(uploaded_at);
CREATE INDEX idx_images_status ON images(status);

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 005: Images table created successfully';
END $$;
