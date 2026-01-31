import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth } from '../middleware/auth';

const geography = new Hono();

// GET /geography/divisions - List all divisions
geography.get('/divisions', requireAuth, async (c) => {
    try {
        const user = c.get('user');

        let divisions;

        // Filter by user hierarchy if not admin
        if (user.roleName !== 'Admin') {
            const [assignment] = await sql`
        SELECT division_id FROM user_assignments 
        WHERE user_id = ${user.userId} AND is_primary = true
      `;

            if (assignment && assignment.division_id) {
                divisions = await sql`
          SELECT 
            id, name, code, circle_id,
            ST_AsGeoJSON(boundary)::json as boundary_geojson,
            ST_Area(boundary::geography) / 1000000 as area_sq_km,
            ST_Perimeter(boundary::geography) / 1000 as perimeter_km,
            created_at
          FROM divisions
          WHERE id = ${assignment.division_id} AND deleted_at IS NULL
        `;
            } else {
                divisions = [];
            }
        } else {
            divisions = await sql`
        SELECT 
          id, name, code, circle_id,
          ST_AsGeoJSON(boundary)::json as boundary_geojson,
          ST_Area(boundary::geography) / 1000000 as area_sq_km,
          ST_Perimeter(boundary::geography) / 1000 as perimeter_km,
          created_at
        FROM divisions
        WHERE deleted_at IS NULL
        ORDER BY name
      `;
        }

        return c.json({ divisions });
    } catch (error) {
        console.error('List divisions error:', error);
        return c.json({ error: 'Failed to fetch divisions' }, 500);
    }
});

// GET /geography/ranges - List all ranges
geography.get('/ranges', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        const { division_id } = c.req.query();

        let query = sql`
      SELECT 
        r.id, r.name, r.code, r.division_id,
        d.name as division_name,
        ST_AsGeoJSON(r.boundary)::json as boundary_geojson,
        ST_Area(r.boundary::geography) / 1000000 as area_sq_km,
        ST_Perimeter(r.boundary::geography) / 1000 as perimeter_km,
        r.created_at
      FROM ranges r
      LEFT JOIN divisions d ON r.division_id = d.id
      WHERE r.deleted_at IS NULL
    `;

        const filters = [];
        if (division_id) {
            filters.push(sql`r.division_id = ${division_id}`);
        }

        // Apply hierarchy restrictions for non-admin users
        if (user.roleName !== 'Admin') {
            const [assignment] = await sql`
        SELECT division_id, range_id FROM user_assignments 
        WHERE user_id = ${user.userId} AND is_primary = true
      `;
            if (assignment) {
                if (assignment.range_id) {
                    filters.push(sql`r.id = ${assignment.range_id}`);
                } else if (assignment.division_id) {
                    filters.push(sql`r.division_id = ${assignment.division_id}`);
                }
            }
        }

        const ranges = await sql`
      ${query}
      ${filters.length > 0 ? sql`AND ${sql.join(filters, sql` AND `)}` : sql``}
      ORDER BY r.name
    `;

        return c.json({ ranges });
    } catch (error) {
        console.error('List ranges error:', error);
        return c.json({ error: 'Failed to fetch ranges' }, 500);
    }
});

// GET /geography/beats - List all beats
geography.get('/beats', requireAuth, async (c) => {
    try {
        const user = c.get('user');
        const { range_id, division_id } = c.req.query();

        let query = sql`
      SELECT 
        b.id, b.name, b.code, b.range_id,
        r.name as range_name,
        d.name as division_name,
        ST_AsGeoJSON(b.boundary)::json as boundary_geojson,
        ST_Area(b.boundary::geography) / 1000000 as area_sq_km,
        ST_Perimeter(b.boundary::geography) / 1000 as perimeter_km,
        b.created_at
      FROM beats b
      LEFT JOIN ranges r ON b.range_id = r.id
      LEFT JOIN divisions d ON r.division_id = d.id
      WHERE b.deleted_at IS NULL
    `;

        const filters = [];
        if (range_id) {
            filters.push(sql`b.range_id = ${range_id}`);
        }
        if (division_id) {
            filters.push(sql`r.division_id = ${division_id}`);
        }

        // Apply hierarchy restrictions for non-admin users
        if (user.roleName !== 'Admin') {
            const [assignment] = await sql`
        SELECT division_id, range_id, beat_id FROM user_assignments 
        WHERE user_id = ${user.userId} AND is_primary = true
      `;
            if (assignment) {
                if (assignment.beat_id) {
                    filters.push(sql`b.id = ${assignment.beat_id}`);
                } else if (assignment.range_id) {
                    filters.push(sql`b.range_id = ${assignment.range_id}`);
                } else if (assignment.division_id) {
                    filters.push(sql`r.division_id = ${assignment.division_id}`);
                }
            }
        }

        const beats = await sql`
      ${query}
      ${filters.length > 0 ? sql`AND ${sql.join(filters, sql` AND `)}` : sql``}
      ORDER BY b.name
    `;

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
      WHERE ST_Within(${point}, boundary) AND deleted_at IS NULL
      LIMIT 1
    `;

        // Find containing range
        const [range] = await sql`
      SELECT id, name, code, division_id
      FROM ranges
      WHERE ST_Within(${point}, boundary) AND deleted_at IS NULL
      LIMIT 1
    `;

        // Find containing beat
        const [beat] = await sql`
      SELECT id, name, code, range_id
      FROM beats
      WHERE ST_Within(${point}, boundary) AND deleted_at IS NULL
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
