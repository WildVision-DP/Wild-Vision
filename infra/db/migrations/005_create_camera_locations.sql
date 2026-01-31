-- Migration: Create Camera Locations History Table
-- Created: 2026-01-31
-- Description: Creates immutable history table for tracking camera location changes over time

CREATE TABLE IF NOT EXISTS camera_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE NOT NULL,
  
  -- Location (PostGIS POINT geometry)
  location GEOMETRY(POINT, 4326) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Temporal validity
  valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valid_to TIMESTAMP,
  
  -- Movement metadata
  reason VARCHAR(255), -- Reason for camera relocation
  moved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create GIST spatial index on location
CREATE INDEX idx_camera_locations_location ON camera_locations USING GIST(location);

-- Create indexes for temporal queries
CREATE INDEX idx_camera_locations_camera_id ON camera_locations(camera_id);
CREATE INDEX idx_camera_locations_valid_from ON camera_locations(valid_from);
CREATE INDEX idx_camera_locations_valid_to ON camera_locations(valid_to);

-- Create composite index for current location queries
CREATE INDEX idx_camera_locations_current ON camera_locations(camera_id, valid_to) 
  WHERE valid_to IS NULL;

-- Add constraint: valid_to must be after valid_from
ALTER TABLE camera_locations ADD CONSTRAINT check_valid_dates
  CHECK (valid_to IS NULL OR valid_to > valid_from);

-- Add constraint: only one active location per camera
CREATE UNIQUE INDEX idx_camera_locations_one_active 
  ON camera_locations(camera_id) 
  WHERE valid_to IS NULL;

-- Trigger to sync location POINT with lat/long
CREATE OR REPLACE FUNCTION sync_camera_location_history()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_camera_location_history
  BEFORE INSERT OR UPDATE ON camera_locations
  FOR EACH ROW
  EXECUTE FUNCTION sync_camera_location_history();

-- Function to create initial location record when camera is created
CREATE OR REPLACE FUNCTION create_initial_camera_location()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO camera_locations (camera_id, latitude, longitude, reason, moved_by)
  VALUES (NEW.id, NEW.latitude, NEW.longitude, 'Initial installation', NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_initial_camera_location
  AFTER INSERT ON cameras
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_camera_location();

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 005: Camera locations history table created successfully';
END $$;
