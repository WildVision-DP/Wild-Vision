import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';

const geography = new Hono();

// GET /geography/circles - List all circles
geography.get('/circles', requireAuth, async (c) => {
    try {
        const circles = await sql`
            SELECT 
                id, name, code,
                ROUND(area_sq_km::numeric, 4) as area_sq_km,
                ROUND(perimeter_km::numeric, 4) as perimeter_km,
                CASE 
                    WHEN boundary IS NOT NULL THEN ST_AsGeoJSON(boundary)::json
                    ELSE NULL
                END as boundary_geojson,
                created_at
            FROM circles
            ORDER BY name
        `;

        return c.json({ circles });
    } catch (error) {
        console.error('List circles error:', error);
        return c.json({ error: 'Failed to fetch circles' }, 500);
    }
});

// POST /geography/circles - Create new circle (Admin and Chief Conservator only)
geography.post('/circles', requireAuth, requireRole('Admin', 'Chief Conservator'), async (c) => {
    try {
        const { name, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name) {
            return c.json({ error: 'Name is required' }, 400);
        }

        const user = c.get('user');
        let boundaryGeom = null;
        
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        // Auto-generate circle code from name - take first letter of each word
        const words = name.trim().split(/\s+/).filter(w => w.length > 0);
        let baseCode = '';
        if (words.length >= 2) {
            // Take first 2-3 letters from first two words
            baseCode = (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase().replace(/[^A-Z]/g, '');
        } else if (words.length === 1) {
            // Single word - take first 3-4 letters
            baseCode = words[0].substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
        }
        if (baseCode.length < 2) {
            return c.json({ error: 'Name too short for code generation' }, 400);
        }

        const [existing] = await sql`
            SELECT COUNT(*) as count FROM circles WHERE code LIKE ${baseCode + '%'}
        `;
        const finalCode =
            parseInt(existing.count) > 0
                ? `${baseCode}${(parseInt(existing.count) + 1).toString().padStart(2, '0')}`
                : baseCode;

        const [circle] = await sql`
            INSERT INTO circles (name, code, boundary, area_sq_km, perimeter_km, created_by)
            VALUES (${name}, ${finalCode}, ${boundaryGeom}, ${area_sq_km || null}, ${perimeter_km || null}, ${user.userId})
            RETURNING id, name, code, area_sq_km, perimeter_km, created_at
        `;

        return c.json({ circle: { ...circle, code: finalCode } }, 201);
    } catch (error) {
        console.error('Create circle error:', error);
        if ((error as any).constraint === 'circles_code_key') {
            return c.json({ error: 'Circle code already exists' }, 409);
        }
        return c.json({ error: 'Failed to create circle' }, 500);
    }
});

// PUT /geography/circles/:id - Update circle (Admin and Chief Conservator only)
geography.put('/circles/:id', requireAuth, requireRole('Admin', 'Chief Conservator'), async (c) => {
    try {
        const circleId = c.req.param('id');
        const { name, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name) {
            return c.json({ error: 'Name is required' }, 400);
        }

        // Get existing code - don't allow code changes
        const [existing] = await sql`SELECT code FROM circles WHERE id = ${circleId}`;
        if (!existing) {
            return c.json({ error: 'Circle not found' }, 404);
        }
        const code = existing.code;

        let boundaryGeom = null;
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        const [circle] = await sql`
            UPDATE circles 
            SET name = ${name}, boundary = ${boundaryGeom}, 
                area_sq_km = ${area_sq_km || null}, perimeter_km = ${perimeter_km || null},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${circleId}
            RETURNING id, name, code, area_sq_km, perimeter_km, updated_at
        `;

        if (!circle) {
            return c.json({ error: 'Circle not found' }, 404);
        }

        return c.json({ circle });
    } catch (error) {
        console.error('Update circle error:', error);
        if ((error as any).constraint === 'circles_code_key') {
            return c.json({ error: 'Circle code already exists' }, 409);
        }
        return c.json({ error: 'Failed to update circle' }, 500);
    }
});

// DELETE /geography/circles/:id - Delete circle (Admin only)
geography.delete('/circles/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const circleId = c.req.param('id');

        // Check if circle has any divisions
        const [divisionCount] = await sql`
            SELECT COUNT(*) as count FROM divisions WHERE circle_id = ${circleId}
        `;

        if (parseInt(divisionCount.count) > 0) {
            return c.json({ error: 'Cannot delete circle with existing divisions' }, 409);
        }

        const [result] = await sql`
            DELETE FROM circles WHERE id = ${circleId}
            RETURNING id
        `;

        if (!result) {
            return c.json({ error: 'Circle not found' }, 404);
        }

        return c.json({ message: 'Circle deleted successfully' });
    } catch (error) {
        console.error('Delete circle error:', error);
        return c.json({ error: 'Failed to delete circle' }, 500);
    }
});

// GET /geography/divisions - List all divisions
geography.get('/divisions', requireAuth, async (c) => {
    try {
        const { circle_id } = c.req.query();
        
        let divisionsQuery;
        if (circle_id) {
            divisionsQuery = sql`
                SELECT 
                    d.id, d.name, d.code, d.circle_id,
                    ROUND(d.area_sq_km::numeric, 4) as area_sq_km,
                    ROUND(d.perimeter_km::numeric, 4) as perimeter_km,
                    c.name as circle_name,
                    CASE 
                        WHEN d.boundary IS NOT NULL THEN ST_AsGeoJSON(d.boundary)::json
                        ELSE NULL
                    END as boundary_geojson,
                    d.created_at
                FROM divisions d
                LEFT JOIN circles c ON d.circle_id = c.id
                WHERE d.circle_id = ${circle_id}
                ORDER BY d.name
            `;
        } else {
            divisionsQuery = sql`
                SELECT 
                    d.id, d.name, d.code, d.circle_id,
                    ROUND(d.area_sq_km::numeric, 4) as area_sq_km,
                    ROUND(d.perimeter_km::numeric, 4) as perimeter_km,
                    c.name as circle_name,
                    CASE 
                        WHEN d.boundary IS NOT NULL THEN ST_AsGeoJSON(d.boundary)::json
                        ELSE NULL
                    END as boundary_geojson,
                    d.created_at
                FROM divisions d
                LEFT JOIN circles c ON d.circle_id = c.id
                ORDER BY d.name
            `;
        }
        
        const divisions = await divisionsQuery;
        return c.json({ divisions });
    } catch (error) {
        console.error('List divisions error:', error);
        console.error('Error details:', (error as any).message || error);
        return c.json({ error: 'Failed to fetch divisions', details: (error as any).message }, 500);
    }
});

// POST /geography/divisions - Create new division (Admin and Chief Conservator only)
geography.post('/divisions', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer'), async (c) => {
    try {
        const { name, circle_id, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !circle_id) {
            return c.json({ error: 'Name and circle_id are required' }, 400);
        }

        const user = c.get('user');
        let boundaryGeom = null;
        
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        // Auto-generate code from name - take first letter of each word
        const words = name.trim().split(/\s+/).filter(w => w.length > 0);
        let base = '';
        if (words.length >= 2) {
            // Take first 2-3 letters from first two words
            base = (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase().replace(/[^A-Z]/g, '');
        } else if (words.length === 1) {
            // Single word - take first 3-4 letters
            base = words[0].substring(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
        }
        if (base.length < 2) {
            return c.json({ error: 'Name too short for code generation' }, 400);
        }
        const [existing] = await sql`
            SELECT COUNT(*) as count FROM divisions WHERE code LIKE ${base + '%'}
        `;
        const finalCode =
            parseInt(existing.count) > 0
                ? `${base}${(parseInt(existing.count) + 1).toString().padStart(2, '0')}`
                : base;

        const [division] = await sql`
            INSERT INTO divisions (name, code, circle_id, boundary, area_sq_km, perimeter_km, created_by)
            VALUES (${name}, ${finalCode}, ${circle_id}, ${boundaryGeom}, ${area_sq_km || null}, ${perimeter_km || null}, ${user.userId})
            RETURNING id, name, code, circle_id, area_sq_km, perimeter_km, created_at
        `;

        return c.json({ division: { ...division, code: finalCode } }, 201);
    } catch (error) {
        console.error('Create division error:', error);
        if ((error as any).constraint === 'divisions_code_key') {
            return c.json({ error: 'Division code already exists' }, 409);
        }
        return c.json({ error: 'Failed to create division' }, 500);
    }
});

// PUT /geography/divisions/:id - Update division
geography.put('/divisions/:id', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer'), async (c) => {
    try {
        const divisionId = c.req.param('id');
        const { name, circle_id, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !circle_id) {
            return c.json({ error: 'Name and circle_id are required' }, 400);
        }

        // Get existing code - don't allow code changes
        const [existing] = await sql`SELECT code FROM divisions WHERE id = ${divisionId}`;
        if (!existing) {
            return c.json({ error: 'Division not found' }, 404);
        }
        const code = existing.code;

        let boundaryGeom = null;
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        const [division] = await sql`
            UPDATE divisions 
            SET name = ${name}, circle_id = ${circle_id}, boundary = ${boundaryGeom}, 
                area = ${area_sq_km || null}, perimeter_km = ${perimeter_km || null},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${divisionId}
            RETURNING id, name, code, circle_id, area_sq_km, perimeter_km, updated_at
        `;

        if (!division) {
            return c.json({ error: 'Division not found' }, 404);
        }

        return c.json({ division });
    } catch (error) {
        console.error('Update division error:', error);
        if ((error as any).constraint === 'divisions_code_key') {
            return c.json({ error: 'Division code already exists' }, 409);
        }
        return c.json({ error: 'Failed to update division' }, 500);
    }
});

// DELETE /geography/divisions/:id - Delete division
geography.delete('/divisions/:id', requireAuth, requireRole('Admin', 'Chief Conservator'), async (c) => {
    try {
        const divisionId = c.req.param('id');

        // Check if division has any ranges
        const [rangeCount] = await sql`
            SELECT COUNT(*) as count FROM ranges WHERE division_id = ${divisionId}
        `;

        if (parseInt(rangeCount.count) > 0) {
            return c.json({ error: 'Cannot delete division with existing ranges' }, 409);
        }

        const [result] = await sql`
            DELETE FROM divisions WHERE id = ${divisionId}
            RETURNING id
        `;

        if (!result) {
            return c.json({ error: 'Division not found' }, 404);
        }

        return c.json({ message: 'Division deleted successfully' });
    } catch (error) {
        console.error('Delete division error:', error);
        return c.json({ error: 'Failed to delete division' }, 500);
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
                // For users without assignments (like ground staff), show all ranges
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

// POST /geography/ranges - Create new range
geography.post('/ranges', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer', 'Range Officer'), async (c) => {
    try {
        const { name, division_id, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !division_id) {
            return c.json({ error: 'Name and division_id are required' }, 400);
        }

        const user = c.get('user');
        let boundaryGeom = null;
        
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        // Get division code to build range code
        const [division] = await sql`SELECT code FROM divisions WHERE id = ${division_id}`;
        if (!division) {
            return c.json({ error: 'Division not found' }, 404);
        }

        const [count] = await sql`
            SELECT COUNT(*) as count FROM ranges WHERE division_id = ${division_id}
        `;
        const nextNumber = (parseInt(count.count) + 1).toString().padStart(2, '0');
        const finalCode = `${division.code}-RNG-${nextNumber}`;

        const [range] = await sql`
            INSERT INTO ranges (name, code, division_id, boundary, area_sq_km, perimeter_km, created_by)
            VALUES (${name}, ${finalCode}, ${division_id}, ${boundaryGeom}, ${area_sq_km || null}, ${perimeter_km || null}, ${user.userId})
            RETURNING id, name, code, division_id, area_sq_km, perimeter_km, created_at
        `;

        return c.json({ range: { ...range, code: finalCode } }, 201);
    } catch (error) {
        console.error('Create range error:', error);
        if ((error as any).constraint === 'ranges_code_key') {
            return c.json({ error: 'Range code already exists' }, 409);
        }
        return c.json({ error: 'Failed to create range' }, 500);
    }
});

// PUT /geography/ranges/:id - Update range
geography.put('/ranges/:id', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer', 'Range Officer'), async (c) => {
    try {
        const rangeId = c.req.param('id');
        const { name, division_id, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !division_id) {
            return c.json({ error: 'Name and division_id are required' }, 400);
        }

        // Get existing code - don't allow code changes
        const [existing] = await sql`SELECT code FROM ranges WHERE id = ${rangeId}`;
        if (!existing) {
            return c.json({ error: 'Range not found' }, 404);
        }
        const code = existing.code;

        let boundaryGeom = null;
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        const [range] = await sql`
            UPDATE ranges 
            SET name = ${name}, division_id = ${division_id}, boundary = ${boundaryGeom}, 
                area = ${area_sq_km || null}, perimeter_km = ${perimeter_km || null},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${rangeId}
            RETURNING id, name, code, division_id, area_sq_km, perimeter_km, updated_at
        `;

        if (!range) {
            return c.json({ error: 'Range not found' }, 404);
        }

        return c.json({ range });
    } catch (error) {
        console.error('Update range error:', error);
        if ((error as any).constraint === 'ranges_code_key') {
            return c.json({ error: 'Range code already exists' }, 409);
        }
        return c.json({ error: 'Failed to update range' }, 500);
    }
});

// DELETE /geography/ranges/:id - Delete range
geography.delete('/ranges/:id', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer'), async (c) => {
    try {
        const rangeId = c.req.param('id');

        // Check if range has any beats
        const [beatCount] = await sql`
            SELECT COUNT(*) as count FROM beats WHERE range_id = ${rangeId}
        `;

        if (parseInt(beatCount.count) > 0) {
            return c.json({ error: 'Cannot delete range with existing beats' }, 409);
        }

        const [result] = await sql`
            DELETE FROM ranges WHERE id = ${rangeId}
            RETURNING id
        `;

        if (!result) {
            return c.json({ error: 'Range not found' }, 404);
        }

        return c.json({ message: 'Range deleted successfully' });
    } catch (error) {
        console.error('Delete range error:', error);
        return c.json({ error: 'Failed to delete range' }, 500);
    }
});

// GET /geography/beats - List all beats
geography.get('/beats', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        const { range_id, division_id } = c.req.query();
        
        let beats;
        
        // Apply role-based filtering only for Role Officers, not Ground Staff
        if (user.roleName !== 'Admin' && user.roleName !== 'Ground Staff' && !range_id && !division_id) {
            const [assignment] = await sql`
                SELECT division_id, range_id, beat_id FROM user_assignments 
                WHERE user_id = ${user.userId} AND is_primary = true
            `;
            if (assignment) {
                if (assignment.beat_id) {
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
                        WHERE b.id = ${assignment.beat_id}
                        ORDER BY b.name
                    `;
                } else if (assignment.range_id) {
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
                        WHERE b.range_id = ${assignment.range_id}
                        ORDER BY b.name
                    `;
                } else if (assignment.division_id) {
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
                        WHERE r.division_id = ${assignment.division_id}
                        ORDER BY b.name
                    `;
                }
                return c.json({ beats });
            }
        }
        
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

// POST /geography/beats - Create new beat
geography.post('/beats', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer', 'Range Officer'), async (c) => {
    try {
        const { name, range_id, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !range_id) {
            return c.json({ error: 'Name and range_id are required' }, 400);
        }

        const user = c.get('user');
        let boundaryGeom = null;
        
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        // Get range code to build beat code
        const [range] = await sql`SELECT code FROM ranges WHERE id = ${range_id}`;
        if (!range) {
            return c.json({ error: 'Range not found' }, 404);
        }

        const [count] = await sql`
            SELECT COUNT(*) as count FROM beats WHERE range_id = ${range_id}
        `;
        const nextNumber = (parseInt(count.count) + 1).toString().padStart(2, '0');
        const finalCode = `${range.code}-BT${nextNumber}`;

        const [beat] = await sql`
            INSERT INTO beats (name, code, range_id, boundary, area_sq_km, perimeter_km, created_by)
            VALUES (${name}, ${finalCode}, ${range_id}, ${boundaryGeom}, ${area_sq_km || null}, ${perimeter_km || null}, ${user.userId})
            RETURNING id, name, code, range_id, area_sq_km, perimeter_km, created_at
        `;

        return c.json({ beat: { ...beat, code: finalCode } }, 201);
    } catch (error) {
        console.error('Create beat error:', error);
        if ((error as any).constraint === 'beats_code_key') {
            return c.json({ error: 'Beat code already exists' }, 409);
        }
        return c.json({ error: 'Failed to create beat' }, 500);
    }
});

// PUT /geography/beats/:id - Update beat
geography.put('/beats/:id', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer', 'Range Officer'), async (c) => {
    try {
        const beatId = c.req.param('id');
        const { name, range_id, boundary, area_sq_km, perimeter_km } = await c.req.json();

        if (!name || !range_id) {
            return c.json({ error: 'Name and range_id are required' }, 400);
        }

        // Get existing code - don't allow code changes
        const [existing] = await sql`SELECT code FROM beats WHERE id = ${beatId}`;
        if (!existing) {
            return c.json({ error: 'Beat not found' }, 404);
        }
        const code = existing.code;

        let boundaryGeom = null;
        if (boundary) {
            boundaryGeom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(boundary)}), 4326)`;
        }

        const [beat] = await sql`
            UPDATE beats 
            SET name = ${name}, range_id = ${range_id}, boundary = ${boundaryGeom}, 
                area = ${area_sq_km || null}, perimeter_km = ${perimeter_km || null},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${beatId}
            RETURNING id, name, code, range_id, area_sq_km, perimeter_km, updated_at
        `;

        if (!beat) {
            return c.json({ error: 'Beat not found' }, 404);
        }

        return c.json({ beat });
    } catch (error) {
        console.error('Update beat error:', error);
        if ((error as any).constraint === 'beats_code_key') {
            return c.json({ error: 'Beat code already exists' }, 409);
        }
        return c.json({ error: 'Failed to update beat' }, 500);
    }
});

// DELETE /geography/beats/:id - Delete beat
geography.delete('/beats/:id', requireAuth, requireRole('Admin', 'Chief Conservator', 'Divisional Officer', 'Range Officer'), async (c) => {
    try {
        const beatId = c.req.param('id');

        // Check if beat has any cameras
        const [cameraCount] = await sql`
            SELECT COUNT(*) as count FROM cameras WHERE beat_id = ${beatId}
        `;

        if (parseInt(cameraCount.count) > 0) {
            return c.json({ error: 'Cannot delete beat with existing cameras. Please reassign or remove cameras first.' }, 409);
        }

        const [result] = await sql`
            DELETE FROM beats WHERE id = ${beatId}
            RETURNING id
        `;

        if (!result) {
            return c.json({ error: 'Beat not found' }, 404);
        }

        return c.json({ message: 'Beat deleted successfully' });
    } catch (error) {
        console.error('Delete beat error:', error);
        return c.json({ error: 'Failed to delete beat' }, 500);
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

export default geography;


