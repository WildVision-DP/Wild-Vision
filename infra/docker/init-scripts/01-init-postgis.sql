-- Initialize PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify PostGIS installation
SELECT PostGIS_Version();

-- Create schema for WildVision
CREATE SCHEMA IF NOT EXISTS wildvision;

-- Set search path
SET search_path TO wildvision, public;

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'WildVision database initialized successfully';
  RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
END $$;
