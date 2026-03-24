# Camera Data Model

## Overview
The camera system tracks wildlife surveillance cameras deployed across forest divisions, ranges, and beats. Each camera has a unique government-issued identifier and precise GPS coordinates.

## Database Schema

### Table: `cameras`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `camera_id` | VARCHAR(50) | Government-issued unique identifier (UNIQUE) |
| `division_id` | UUID | Foreign key to divisions table |
| `range_id` | UUID | Foreign key to ranges table |
| `beat_id` | UUID | Foreign key to beats table |
| `location` | GEOMETRY(POINT, 4326) | PostGIS point geometry |
| `latitude` | DECIMAL(10, 8) | Latitude coordinate |
| `longitude` | DECIMAL(11, 8) | Longitude coordinate |
| `camera_model` | VARCHAR(100) | Camera model name |
| `serial_number` | VARCHAR(100) | Camera serial number |
| `install_date` | DATE | Installation date |
| `status` | VARCHAR(20) | Status: active, inactive, maintenance, decommissioned |
| `notes` | TEXT | Additional notes |
| `created_by` | UUID | User who created the record |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

## Constraints

### GPS Bounds Validation
Cameras must be located within India's geographical bounds:
- **Latitude:** 8.0°N to 37.0°N
- **Longitude:** 68.0°E to 97.0°E

### Status Values
- `active` - Camera is operational
- `inactive` - Camera is not currently in use
- `maintenance` - Camera is under maintenance
- `decommissioned` - Camera has been permanently removed

## Indexes

### Spatial Index
- **GIST index** on `location` column for efficient spatial queries

### B-tree Indexes
- `camera_id` - Unique identifier lookups
- `division_id` - Filter by division
- `range_id` - Filter by range
- `beat_id` - Filter by beat
- `status` - Filter by status
- `deleted_at` - Soft delete queries

## Triggers

### `sync_camera_location`
Automatically syncs the PostGIS `location` POINT geometry from `latitude` and `longitude` values on INSERT or UPDATE.

### `update_cameras_updated_at`
Automatically updates the `updated_at` timestamp on every UPDATE.

## Spatial Queries

### Find cameras within a polygon
```sql
SELECT * FROM cameras 
WHERE ST_Within(location, ST_GeomFromGeoJSON('{"type":"Polygon",...}'));
```

### Find cameras within radius
```sql
SELECT * FROM cameras 
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
  1000  -- 1000 meters
);
```

### Find cameras in a division
```sql
SELECT c.* FROM cameras c
JOIN divisions d ON c.division_id = d.id
WHERE d.name = 'Bandipur Division';
```

## API Endpoints

### GET /cameras
List all cameras with pagination and filtering

### GET /cameras/:id
Get camera details by ID

### POST /cameras
Create a new camera (Admin/Divisional Officer only)

### PUT /cameras/:id
Update camera details

### DELETE /cameras/:id
Soft delete a camera

### POST /cameras/:id/move
Move camera to new location (creates history record)

### GET /cameras/:id/history
Get camera location history
