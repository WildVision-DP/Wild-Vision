-- Migration: Create Cameras Table
-- Created: 2026-01-31
-- Description: Creates cameras table with PostGIS geometry for camera locations and tracking

CREATE TABLE IF NOT EXISTS cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id VARCHAR(50) UNIQUE NOT NULL, -- Government-issued unique identifier
  
  -- Hierarchy assignment
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  range_id UUID REFERENCES ranges(id) ON DELETE SET NULL,
  beat_id UUID REFERENCES beats(id) ON DELETE SET NULL,
  
  -- Location (PostGIS POINT geometry)
  location GEOMETRY(POINT, 4326) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Camera details
  camera_model VARCHAR(100),
  serial_number VARCHAR(100),
  install_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'decommissioned')),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create GIST spatial index on location
CREATE INDEX idx_cameras_location ON cameras USING GIST(location);

-- Create indexes for common queries
CREATE INDEX idx_cameras_camera_id ON cameras(camera_id);
CREATE INDEX idx_cameras_division_id ON cameras(division_id);
CREATE INDEX idx_cameras_range_id ON cameras(range_id);
CREATE INDEX idx_cameras_beat_id ON cameras(beat_id);
CREATE INDEX idx_cameras_status ON cameras(status);
CREATE INDEX idx_cameras_deleted_at ON cameras(deleted_at);

-- Add constraint to validate India GPS bounds
-- India bounds: Latitude 8°N to 37°N, Longitude 68°E to 97°E
ALTER TABLE cameras ADD CONSTRAINT check_india_bounds 
  CHECK (
    latitude >= 8.0 AND latitude <= 37.0 AND
    longitude >= 68.0 AND longitude <= 97.0
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cameras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cameras_updated_at
  BEFORE UPDATE ON cameras
  FOR EACH ROW
  EXECUTE FUNCTION update_cameras_updated_at();

-- Trigger to sync location POINT with lat/long
CREATE OR REPLACE FUNCTION sync_camera_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_camera_location
  BEFORE INSERT OR UPDATE ON cameras
  FOR EACH ROW
  EXECUTE FUNCTION sync_camera_location();

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 004: Cameras table created successfully';
END $$;
