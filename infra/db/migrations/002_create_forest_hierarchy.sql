-- Migration: Create Forest Hierarchy Schema
-- Created: 2026-01-31
-- Description: Creates tables for forest administrative boundaries (circles, divisions, ranges, beats) with PostGIS geometry

-- Create circles table (top-level administrative unit)
CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  boundary GEOMETRY(MULTIPOLYGON, 4326), -- PostGIS geometry for boundaries
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create divisions table
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  boundary GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ranges table
CREATE TABLE IF NOT EXISTS ranges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  division_id UUID REFERENCES divisions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  boundary GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create beats table
CREATE TABLE IF NOT EXISTS beats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  range_id UUID REFERENCES ranges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  boundary GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_assignments table (links users to their territorial jurisdiction)
CREATE TABLE IF NOT EXISTS user_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
  division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
  range_id UUID REFERENCES ranges(id) ON DELETE SET NULL,
  beat_id UUID REFERENCES beats(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, circle_id, division_id, range_id, beat_id)
);

-- Create spatial indexes for geometry columns
CREATE INDEX idx_circles_boundary ON circles USING GIST(boundary);
CREATE INDEX idx_divisions_boundary ON divisions USING GIST(boundary);
CREATE INDEX idx_ranges_boundary ON ranges USING GIST(boundary);
CREATE INDEX idx_beats_boundary ON beats USING GIST(boundary);

-- Create regular indexes for foreign keys
CREATE INDEX idx_divisions_circle_id ON divisions(circle_id);
CREATE INDEX idx_ranges_division_id ON ranges(division_id);
CREATE INDEX idx_beats_range_id ON beats(range_id);
CREATE INDEX idx_user_assignments_user_id ON user_assignments(user_id);
CREATE INDEX idx_user_assignments_circle_id ON user_assignments(circle_id);
CREATE INDEX idx_user_assignments_division_id ON user_assignments(division_id);
CREATE INDEX idx_user_assignments_range_id ON user_assignments(range_id);
CREATE INDEX idx_user_assignments_beat_id ON user_assignments(beat_id);

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 002: Forest Hierarchy schema created successfully';
END $$;
