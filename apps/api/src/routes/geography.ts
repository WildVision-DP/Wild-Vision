import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';

const geography = new Hono();

// GET /geography/divisions - List all divisions
geography.get('/divisions', requireAuth, async (c) => {
    try {
        const divisions = await sql`
            SELECT 
                id, name, code, circle_id,
                area_sq_km, perimeter_km,
                CASE 
                    WHEN boundary IS NOT NULL THEN ST_AsGeoJSON(boundary)::json
                    ELSE NULL
                END as boundary_geojson,
                created_at
            FROM divisions
            ORDER BY name
        `;

        return c.json({ divisions });
    } catch (error) {
        console.error('List divisions error:', error);
        console.error('Error details:', (error as any).message || error);
        return c.json({ error: 'Failed to fetch divisions', details: (error as any).message }, 500);
    }
});

// GET /geography/ranges - List all ranges
geography.get('/ranges', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        const { division_id } = c.req.query();

        let ranges: any[] = [];

        // Apply hierarchy restrictions for non-admin users
        if (user.roleName !== 'Admin') {
            const [assignment] = await sql`
        SELECT division_id, range_id FROM user_assignments 
        WHERE user_id = ${user.userId} AND is_primary = true
      `;
            if (assignment && assignment.range_id) {
                ranges = await sql`
          SELECT 
            r.id, r.name, r.code, r.division_id,
            d.name as division_name,
            ST_AsGeoJSON(r.boundary)::json as boundary_geojson,
            ST_Area(r.boundary::geography) / 1000000 as area_sq_km,
            ST_Perimeter(r.boundary::geography) / 1000 as perimeter_km,
            r.created_at
          FROM ranges r
          LEFT JOIN divisions d ON r.division_id = d.id
          WHERE r.id = ${assignment.range_id}
          ORDER BY r.name
        `;
            } else if (assignment && assignment.division_id) {
                ranges = await sql`
          SELECT 
            r.id, r.name, r.code, r.division_id,
            ROUND(r.area_sq_km::numeric, 4) as area_sq_km,
            ROUND(r.perimeter_km::numeric, 4) as perimeter_km,
            d.name as division_name,
            CASE 
              WHEN r.boundary IS NOT NULL THEN ST_AsGeoJSON(r.boundary)::json
              ELSE NULL
            END as boundary_geojson,
            r.created_at
          FROM ranges r
          LEFT JOIN divisions d ON r.division_id = d.id
          WHERE r.division_id = ${assignment.division_id}
          ORDER BY r.name
        `;
            } else {
                ranges = [];
            }
        } else if (division_id) {
            ranges = await sql`
        SELECT 
          r.id, r.name, r.code, r.division_id,
          ROUND(r.area_sq_km::numeric, 4) as area_sq_km,
          ROUND(r.perimeter_km::numeric, 4) as perimeter_km,
          d.name as division_name,
          CASE 
            WHEN r.boundary IS NOT NULL THEN ST_AsGeoJSON(r.boundary)::json
            ELSE NULL
          END as boundary_geojson,
          r.created_at
        FROM ranges r
        LEFT JOIN divisions d ON r.division_id = d.id
        WHERE r.division_id = ${division_id}
        ORDER BY r.name
      `;
        } else {
            ranges = await sql`
        SELECT 
          r.id, r.name, r.code, r.division_id,
          ROUND(r.area_sq_km::numeric, 4) as area_sq_km,
          ROUND(r.perimeter_km::numeric, 4) as perimeter_km,
          d.name as division_name,
          CASE 
            WHEN r.boundary IS NOT NULL THEN ST_AsGeoJSON(r.boundary)::json
            ELSE NULL
          END as boundary_geojson,
          r.created_at
        FROM ranges r
        LEFT JOIN divisions d ON r.division_id = d.id
        ORDER BY r.name
      `;
        }

        return c.json({ ranges });
    } catch (error) {
        console.error('List ranges error:', error);
        return c.json({ error: 'Failed to fetch ranges' }, 500);
    }
});

// GET /geography/beats - List all beats
geography.get('/beats', requireAuth, async (c) => {
    try {
        const { range_id, division_id } = c.req.query();
        
        let beats;
        if (range_id) {
            beats = await sql`
                SELECT 
                    b.id, b.name, b.code, b.range_id, 
                    ROUND(b.area_sq_km::numeric, 4) as area_sq_km, 
                    ROUND(b.perimeter_km::numeric, 4) as perimeter_km,
                    r.name as range_name,
                    d.name as division_name,
                    CASE 
                        WHEN b.boundary IS NOT NULL THEN ST_AsGeoJSON(b.boundary)::json
                        ELSE NULL
                    END as boundary_geojson,
                    b.created_at
                FROM beats b
                LEFT JOIN ranges r ON b.range_id = r.id
                LEFT JOIN divisions d ON r.division_id = d.id
                WHERE b.range_id = ${range_id}
                ORDER BY b.name
            `;
        } else if (division_id) {
            beats = await sql`
                SELECT 
                    b.id, b.name, b.code, b.range_id, 
                    ROUND(b.area_sq_km::numeric, 4) as area_sq_km, 
                    ROUND(b.perimeter_km::numeric, 4) as perimeter_km,
                    r.name as range_name,
                    d.name as division_name,
                    CASE 
                        WHEN b.boundary IS NOT NULL THEN ST_AsGeoJSON(b.boundary)::json
                        ELSE NULL
                    END as boundary_geojson,
                    b.created_at
                FROM beats b
                LEFT JOIN ranges r ON b.range_id = r.id
                LEFT JOIN divisions d ON r.division_id = d.id
                WHERE r.division_id = ${division_id}
                ORDER BY b.name
            `;
        } else {
            beats = await sql`
                SELECT 
                    b.id, b.name, b.code, b.range_id, 
                    ROUND(b.area_sq_km::numeric, 4) as area_sq_km, 
                    ROUND(b.perimeter_km::numeric, 4) as perimeter_km,
                    r.name as range_name,
                    d.name as division_name,
                    CASE 
                        WHEN b.boundary IS NOT NULL THEN ST_AsGeoJSON(b.boundary)::json
                        ELSE NULL
                    END as boundary_geojson,
                    b.created_at
                FROM beats b
                LEFT JOIN ranges r ON b.range_id = r.id
                LEFT JOIN divisions d ON r.division_id = d.id
                ORDER BY b.name
            `;
        }

        return c.json({ beats });
    } catch (error) {
        console.error('List beats error:', error);
        return c.json({ error: 'Failed to fetch beats' }, 500);
    }
});

// GET /geography/point-in-polygon - Check if a point is within any boundary
geography.get('/point-in-polygon', requireAuth, async (c) => {
    try {
        const { latitude, longitude } = c.req.query();

        if (!latitude || !longitude) {
            return c.json({ error: 'latitude and longitude are required' }, 400);
        }

        const point = sql`ST_SetSRID(ST_MakePoint(${parseFloat(longitude)}, ${parseFloat(latitude)}), 4326)`;

        // Find containing division
        const [division] = await sql`
      SELECT id, name, code
      FROM divisions
      WHERE ST_Within(${point}, boundary)
      LIMIT 1
    `;

        // Find containing range
        const [range] = await sql`
      SELECT id, name, code, division_id
      FROM ranges
      WHERE ST_Within(${point}, boundary)
      LIMIT 1
    `;

        // Find containing beat
        const [beat] = await sql`
      SELECT id, name, code, range_id
      FROM beats
      WHERE ST_Within(${point}, boundary)
      LIMIT 1
    `;

        return c.json({
            location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
            division: division || null,
            range: range || null,
            beat: beat || null,
        });
    } catch (error) {
        console.error('Point in polygon error:', error);
        return c.json({ error: 'Failed to check location' }, 500);
    }
});

// POST /geography/divisions - Create division
geography.post('/divisions', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { name, circle_id, area_sq_km, perimeter_km } = await c.req.json();

        if (!name) {
            return c.json({ error: 'Name is required' }, 400);
        }

        // Auto-generate code from name abbreviation
        const code = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
        if (code.length < 2) {
            return c.json({ error: 'Name too short for code generation' }, 400);
        }

        // Check if code exists, if so append number
        const [existing] = await sql`SELECT COUNT(*) as count FROM divisions WHERE code LIKE ${code + '%'}`;
        const finalCode = existing.count > 0 ? `${code}${(parseInt(existing.count) + 1).toString().padStart(2, '0')}` : code;

        const [division] = await sql`
            INSERT INTO divisions (name, code, circle_id)
            VALUES (${name}, ${finalCode}, ${circle_id || null})
            RETURNING id, name, code, circle_id, created_at
        `;

        // Update area/perimeter if provided
        if (area_sq_km || perimeter_km) {
            await sql`
                UPDATE divisions 
                SET area_sq_km = ${area_sq_km ? parseFloat(area_sq_km) : null},
                    perimeter_km = ${perimeter_km ? parseFloat(perimeter_km) : null}
                WHERE id = ${division.id}
            `;
        }

        return c.json({ message: 'Division created successfully', division: { ...division, code: finalCode } }, 201);
    } catch (error) {
        console.error('Create division error:', error);
        return c.json({ error: 'Failed to create division' }, 500);
    }
});

// PUT /geography/divisions/:id - Update division
geography.put('/divisions/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();
        const { name, circle_id, area_sq_km, perimeter_km } = await c.req.json();

        const [division] = await sql`
            UPDATE divisions 
            SET name = COALESCE(${name || null}, name),
                circle_id = COALESCE(${circle_id || null}, circle_id),
                area_sq_km = ${area_sq_km ? parseFloat(area_sq_km) : null},
                perimeter_km = ${perimeter_km ? parseFloat(perimeter_km) : null}
            WHERE id = ${id}
            RETURNING id, name, code, circle_id, area_sq_km, perimeter_km
        `;

        if (!division) {
            return c.json({ error: 'Division not found' }, 404);
        }

        return c.json({ message: 'Division updated successfully', division });
    } catch (error) {
        console.error('Update division error:', error);
        return c.json({ error: 'Failed to update division' }, 500);
    }
});

// DELETE /geography/divisions/:id - Delete division
geography.delete('/divisions/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();

        // Check if division has ranges
        const [hasRanges] = await sql`SELECT id FROM ranges WHERE division_id = ${id} LIMIT 1`;
        if (hasRanges) {
            return c.json({ error: 'Cannot delete division with existing ranges' }, 400);
        }

        const [division] = await sql`DELETE FROM divisions WHERE id = ${id} RETURNING id`;
        if (!division) {
            return c.json({ error: 'Division not found' }, 404);
        }

        return c.json({ message: 'Division deleted successfully' });
    } catch (error) {
        console.error('Delete division error:', error);
        return c.json({ error: 'Failed to delete division' }, 500);
    }
});

// POST /geography/ranges - Create range
geography.post('/ranges', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { name, division_id, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !division_id) {
            return c.json({ error: 'Name and division are required' }, 400);
        }

        // Get division code
        const [division] = await sql`SELECT code FROM divisions WHERE id = ${division_id}`;
        if (!division) {
            return c.json({ error: 'Division not found' }, 404);
        }

        // Auto-generate code: DIV-RNG-01 format
        const [count] = await sql`SELECT COUNT(*) as count FROM ranges WHERE division_id = ${division_id}`;
        const nextNumber = (parseInt(count.count) + 1).toString().padStart(2, '0');
        const code = `${division.code}-RNG-${nextNumber}`;

        const [range] = await sql`
            INSERT INTO ranges (name, code, division_id)
            VALUES (${name}, ${code}, ${division_id})
            RETURNING id, name, code, division_id, created_at
        `;

        // Update area/perimeter if provided
        if (area_sq_km || perimeter_km) {
            await sql`
                UPDATE ranges 
                SET area_sq_km = ${area_sq_km ? parseFloat(area_sq_km) : null},
                    perimeter_km = ${perimeter_km ? parseFloat(perimeter_km) : null}
                WHERE id = ${range.id}
            `;
        }

        return c.json({ message: 'Range created successfully', range: { ...range, code } }, 201);
    } catch (error) {
        console.error('Create range error:', error);
        return c.json({ error: 'Failed to create range' }, 500);
    }
});

// PUT /geography/ranges/:id - Update range
geography.put('/ranges/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();
        const { name, division_id, area_sq_km, perimeter_km } = await c.req.json();

        // Parse and validate numeric values with proper precision
        let parsedArea = null;
        let parsedPerimeter = null;

        if (area_sq_km !== undefined && area_sq_km !== null && area_sq_km !== '') {
            parsedArea = parseFloat(area_sq_km);
            if (isNaN(parsedArea) || parsedArea < 0) {
                return c.json({ error: 'Area must be a valid positive number' }, 400);
            }
            // Round to 4 decimal places
            parsedArea = Math.round(parsedArea * 10000) / 10000;
        }

        if (perimeter_km !== undefined && perimeter_km !== null && perimeter_km !== '') {
            parsedPerimeter = parseFloat(perimeter_km);
            if (isNaN(parsedPerimeter) || parsedPerimeter < 0) {
                return c.json({ error: 'Perimeter must be a valid positive number' }, 400);
            }
            // Round to 4 decimal places
            parsedPerimeter = Math.round(parsedPerimeter * 10000) / 10000;
        }

        const [range] = await sql`
            UPDATE ranges 
            SET name = COALESCE(${name || null}, name),
                division_id = COALESCE(${division_id || null}, division_id),
                area_sq_km = COALESCE(${parsedArea}, area_sq_km),
                perimeter_km = COALESCE(${parsedPerimeter}, perimeter_km),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id}
            RETURNING id, name, code, division_id, 
                      ROUND(area_sq_km::numeric, 4) as area_sq_km, 
                      ROUND(perimeter_km::numeric, 4) as perimeter_km
        `;

        if (!range) {
            return c.json({ error: 'Range not found' }, 404);
        }

        return c.json({ message: 'Range updated successfully', range });
    } catch (error) {
        console.error('Update range error:', error);
        return c.json({ error: 'Failed to update range' }, 500);
    }
});

// DELETE /geography/ranges/:id - Delete range
geography.delete('/ranges/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();

        // Check if range has beats
        const [hasBeats] = await sql`SELECT id FROM beats WHERE range_id = ${id} LIMIT 1`;
        if (hasBeats) {
            return c.json({ error: 'Cannot delete range with existing beats' }, 400);
        }

        const [range] = await sql`DELETE FROM ranges WHERE id = ${id} RETURNING id`;
        if (!range) {
            return c.json({ error: 'Range not found' }, 404);
        }

        return c.json({ message: 'Range deleted successfully' });
    } catch (error) {
        console.error('Delete range error:', error);
        return c.json({ error: 'Failed to delete range' }, 500);
    }
});

// POST /geography/beats - Create beat
geography.post('/beats', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { name, range_id, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !range_id) {
            return c.json({ error: 'Name and range are required' }, 400);
        }

        // Get range code
        const [range] = await sql`SELECT code FROM ranges WHERE id = ${range_id}`;
        if (!range) {
            return c.json({ error: 'Range not found' }, 404);
        }

        // Auto-generate code: DIV-RNG-N01-BT01 format
        const [count] = await sql`SELECT COUNT(*) as count FROM beats WHERE range_id = ${range_id}`;
        const nextNumber = (parseInt(count.count) + 1).toString().padStart(2, '0');
        const code = `${range.code}-BT${nextNumber}`;

        const [beat] = await sql`
            INSERT INTO beats (name, code, range_id)
            VALUES (${name}, ${code}, ${range_id})
            RETURNING id, name, code, range_id, created_at
        `;

        // Update area/perimeter if provided
        if (area_sq_km || perimeter_km) {
            await sql`
                UPDATE beats 
                SET area_sq_km = ${area_sq_km ? parseFloat(area_sq_km) : null},
                    perimeter_km = ${perimeter_km ? parseFloat(perimeter_km) : null}
                WHERE id = ${beat.id}
            `;
        }

        return c.json({ message: 'Beat created successfully', beat: { ...beat, code } }, 201);
    } catch (error) {
        console.error('Create beat error:', error);
        return c.json({ error: 'Failed to create beat' }, 500);
    }
});

// PUT /geography/beats/:id - Update beat
geography.put('/beats/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();
        const { name, range_id, area_sq_km, perimeter_km } = await c.req.json();

        const [beat] = await sql`
            UPDATE beats 
            SET name = COALESCE(${name || null}, name),
                range_id = COALESCE(${range_id || null}, range_id),
                area_sq_km = ${area_sq_km ? parseFloat(area_sq_km) : null},
                perimeter_km = ${perimeter_km ? parseFloat(perimeter_km) : null}
            WHERE id = ${id}
            RETURNING id, name, code, range_id, area_sq_km, perimeter_km
        `;

        if (!beat) {
            return c.json({ error: 'Beat not found' }, 404);
        }

        return c.json({ message: 'Beat updated successfully', beat });
    } catch (error) {
        console.error('Update beat error:', error);
        return c.json({ error: 'Failed to update beat' }, 500);
    }
});

// DELETE /geography/beats/:id - Delete beat
geography.delete('/beats/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();

        // Check if beat has cameras
        const [hasCameras] = await sql`SELECT id FROM cameras WHERE beat_id = ${id} LIMIT 1`;
        if (hasCameras) {
            return c.json({ error: 'Cannot delete beat with existing cameras' }, 400);
        }

        const [beat] = await sql`DELETE FROM beats WHERE id = ${id} RETURNING id`;
        if (!beat) {
            return c.json({ error: 'Beat not found' }, 404);
        }

        return c.json({ message: 'Beat deleted successfully' });
    } catch (error) {
        console.error('Delete beat error:', error);
        return c.json({ error: 'Failed to delete beat' }, 500);
    }
});

export default geography;
