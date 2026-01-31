import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRole, requireRoleLevel } from '../middleware/auth';

const cameras = new Hono();

// GET /cameras - List all cameras
cameras.get('/', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { page = '1', limit = '50', status, division_id, range_id, beat_id } = c.req.query();

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query based on user role
    let query = sql`
      SELECT 
        c.id, c.camera_id, c.camera_name, c.brand_id, c.division_id, c.range_id, c.beat_id,
        c.latitude::float, c.longitude::float, c.camera_model, 
        c.serial_number, c.install_date, c.status, c.notes,
        cb.name as brand_name, cb.code as brand_code,
        d.name as division_name, r.name as range_name, b.name as beat_name,
        c.created_at, c.updated_at
      FROM cameras c
      LEFT JOIN camera_brands cb ON c.brand_id = cb.id
      LEFT JOIN divisions d ON c.division_id = d.id
      LEFT JOIN ranges r ON c.range_id = r.id
      LEFT JOIN beats b ON c.beat_id = b.id
      WHERE c.deleted_at IS NULL
    `;

    // Apply filters
    const filters = [];
    if (status) filters.push(sql`c.status = ${status}`);
    if (division_id) filters.push(sql`c.division_id = ${division_id}`);
    if (range_id) filters.push(sql`c.range_id = ${range_id}`);
    if (beat_id) filters.push(sql`c.beat_id = ${beat_id}`);

    // Apply hierarchy restrictions for non-admin users
    if (user.roleName !== 'Admin') {
      const [assignment] = await sql`
        SELECT division_id, range_id, beat_id 
        FROM user_assignments 
        WHERE user_id = ${user.userId} AND is_primary = true
      `;
      if (assignment) {
        if (assignment.division_id) filters.push(sql`c.division_id = ${assignment.division_id}`);
        if (assignment.range_id) filters.push(sql`c.range_id = ${assignment.range_id}`);
        if (assignment.beat_id) filters.push(sql`c.beat_id = ${assignment.beat_id}`);
      }
    }

    // Build WHERE clause
    let whereClause = sql`WHERE c.deleted_at IS NULL`;
    if (filters.length > 0) {
      for (const filter of filters) {
        whereClause = sql`${whereClause} AND ${filter}`;
      }
    }

    const result = await sql`
      SELECT 
        c.id, c.camera_id, c.camera_name, c.brand_id, 
        cb.name as brand_name, cb.code as brand_code,
        c.latitude::float, c.longitude::float, c.camera_model, 
        c.serial_number, c.install_date, c.status, c.notes,
        d.name as division_name, r.name as range_name, b.name as beat_name,
        c.created_at, c.updated_at
      FROM cameras c
      LEFT JOIN camera_brands cb ON c.brand_id = cb.id
      LEFT JOIN divisions d ON c.division_id = d.id
      LEFT JOIN ranges r ON c.range_id = r.id
      LEFT JOIN beats b ON c.beat_id = b.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;

    const [{ count }] = await sql`
      SELECT COUNT(*) as count FROM cameras WHERE deleted_at IS NULL
    `;

    return c.json({
      cameras: result,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        totalPages: Math.ceil(parseInt(count) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('List cameras error:', error);
    return c.json({ error: 'Failed to fetch cameras' }, 500);
  }
});

// GET /cameras/:id - Get camera by ID
cameras.get('/:id', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();

    const [camera] = await sql`
      SELECT 
        c.*, 
        c.latitude::float, c.longitude::float,
        cb.name as brand_name, cb.code as brand_code,
        d.name as division_name, 
        r.name as range_name, 
        b.name as beat_name,
        u.full_name as created_by_name
      FROM cameras c
      LEFT JOIN camera_brands cb ON c.brand_id = cb.id
      LEFT JOIN divisions d ON c.division_id = d.id
      LEFT JOIN ranges r ON c.range_id = r.id
      LEFT JOIN beats b ON c.beat_id = b.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ${id} AND c.deleted_at IS NULL
    `;

    if (!camera) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    return c.json({ camera });
  } catch (error) {
    console.error('Get camera error:', error);
    return c.json({ error: 'Failed to fetch camera' }, 500);
  }
});

// POST /cameras - Create new camera
cameras.post('/', requireAuth, requireRoleLevel(2), async (c) => {
  try {
    const user = c.get('user');
    const {
      brand_id,
      camera_name,
      division_id,
      range_id,
      beat_id,
      latitude,
      longitude,
      camera_model,
      serial_number,
      install_date,
      status = 'active',
      notes,
    } = await c.req.json();

    // Validate required fields
    if (!brand_id || !camera_name || !beat_id || !latitude || !longitude) {
      return c.json({ error: 'brand_id, camera_name, beat_id, latitude, and longitude are required' }, 400);
    }

    // Get brand code for camera ID generation
    const [brand] = await sql`SELECT code FROM camera_brands WHERE id = ${brand_id}`;
    if (!brand) {
      return c.json({ error: 'Brand not found' }, 404);
    }

    // Get beat code for camera ID generation
    const [beat] = await sql`SELECT code FROM beats WHERE id = ${beat_id}`;
    if (!beat) {
      return c.json({ error: 'Beat not found' }, 404);
    }

    // Auto-generate camera ID: BRAND-BEAT_CODE-CAM##
    const [count] = await sql`SELECT COUNT(*) as count FROM cameras WHERE beat_id = ${beat_id}`;
    const nextNumber = (parseInt(count.count) + 1).toString().padStart(2, '0');
    const camera_id = `${brand.code}-${beat.code}-CAM${nextNumber}`;

    const [camera] = await sql`
      INSERT INTO cameras (
        camera_id, brand_id, camera_name, division_id, range_id, beat_id,
        latitude, longitude, camera_model, serial_number,
        install_date, status, notes, created_by
      ) VALUES (
        ${camera_id}, ${brand_id}, ${camera_name}, ${division_id || null}, ${range_id || null}, ${beat_id || null},
        ${latitude}, ${longitude}, ${camera_model || null}, ${serial_number || null},
        ${install_date || null}, ${status}, ${notes || null}, ${user.userId}
      )
      RETURNING *
    `;

    // Log audit
    await sql`
      INSERT INTO audit_logs (user_id, action, metadata)
      VALUES (${user.userId}, 'camera_created', ${JSON.stringify({ camera_id: camera.id })})
    `;

    return c.json({ message: 'Camera created successfully', camera }, 201);
  } catch (error) {
    console.error('Create camera error:', error);
    return c.json({ error: 'Failed to create camera' }, 500);
  }
});

// PUT /cameras/:id - Update camera
cameras.put('/:id', requireAuth, requireRoleLevel(2), async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.param();
    const updates = await c.req.json();

    // Validate location if provided
    if (updates.latitude || updates.longitude) {
      if (!updates.latitude || !updates.longitude) {
        return c.json({ error: 'Both latitude and longitude must be provided when updating location' }, 400);
      }
      // Validate India bounds
      if (updates.latitude < 8.0 || updates.latitude > 37.0 || updates.longitude < 68.0 || updates.longitude > 97.0) {
        return c.json({ error: 'Location must be within India bounds' }, 400);
      }
    }

    const [camera] = await sql`
      UPDATE cameras SET
        camera_name = COALESCE(${updates.camera_name || null}, camera_name),
        brand_id = COALESCE(${updates.brand_id || null}, brand_id),
        division_id = COALESCE(${updates.division_id || null}, division_id),
        range_id = COALESCE(${updates.range_id || null}, range_id),
        beat_id = COALESCE(${updates.beat_id || null}, beat_id),
        camera_model = COALESCE(${updates.camera_model || null}, camera_model),
        serial_number = COALESCE(${updates.serial_number || null}, serial_number),
        latitude = COALESCE(${updates.latitude || null}, latitude),
        longitude = COALESCE(${updates.longitude || null}, longitude),
        status = COALESCE(${updates.status || null}, status),
        notes = COALESCE(${updates.notes || null}, notes),
        install_date = COALESCE(${updates.install_date || null}, install_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;

    if (!camera) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    // Log audit
    await sql`
      INSERT INTO audit_logs (user_id, action, metadata)
      VALUES (${user.userId}, 'camera_updated', ${JSON.stringify({ camera_id: id, updates })})
    `;

    return c.json({ message: 'Camera updated successfully', camera });
  } catch (error) {
    console.error('Update camera error:', error);
    return c.json({ error: 'Failed to update camera' }, 500);
  }
});

// DELETE /cameras/:id - Soft delete camera
cameras.delete('/:id', requireAuth, requireRole('Admin'), async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.param();

    const [camera] = await sql`
      UPDATE cameras 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, camera_id
    `;

    if (!camera) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    // Log audit
    await sql`
      INSERT INTO audit_logs (user_id, action, metadata)
      VALUES (${user.userId}, 'camera_deleted', ${JSON.stringify({ camera_id: id })})
    `;

    return c.json({ message: 'Camera deleted successfully' });
  } catch (error) {
    console.error('Delete camera error:', error);
    return c.json({ error: 'Failed to delete camera' }, 500);
  }
});

// POST /cameras/:id/move - Move camera to new location
cameras.post('/:id/move', requireAuth, requireRoleLevel(2), async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.param();
    const { latitude, longitude, reason, notes } = await c.req.json();

    // Validate required fields
    if (!latitude || !longitude) {
      return c.json({ error: 'latitude and longitude are required' }, 400);
    }

    // Validate India bounds
    if (latitude < 8.0 || latitude > 37.0 || longitude < 68.0 || longitude > 97.0) {
      return c.json({ error: 'Location must be within India bounds' }, 400);
    }

    // Check if camera exists
    const [camera] = await sql`
      SELECT id, camera_id FROM cameras WHERE id = ${id} AND deleted_at IS NULL
    `;

    if (!camera) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    // Close current location record
    await sql`
      UPDATE camera_locations
      SET valid_to = CURRENT_TIMESTAMP
      WHERE camera_id = ${id} AND valid_to IS NULL
    `;

    // Create new location record
    const [newLocation] = await sql`
      INSERT INTO camera_locations (
        camera_id, latitude, longitude, reason, moved_by, notes
      ) VALUES (
        ${id}, ${latitude}, ${longitude}, ${reason || 'Camera relocation'}, ${user.userId}, ${notes}
      )
      RETURNING *
    `;

    // Update camera's current location
    await sql`
      UPDATE cameras
      SET latitude = ${latitude}, longitude = ${longitude}
      WHERE id = ${id}
    `;

    // Log audit
    await sql`
      INSERT INTO audit_logs (user_id, action, metadata)
      VALUES (
        ${user.userId}, 
        'camera_moved', 
        ${JSON.stringify({ camera_id: id, from: 'previous', to: { latitude, longitude }, reason })}
      )
    `;

    return c.json({
      message: 'Camera moved successfully',
      location: newLocation
    });
  } catch (error) {
    console.error('Move camera error:', error);
    return c.json({ error: 'Failed to move camera' }, 500);
  }
});

// GET /cameras/:id/history - Get camera location history
cameras.get('/:id/history', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();

    const history = await sql`
      SELECT 
        cl.id, cl.latitude, cl.longitude, cl.valid_from, cl.valid_to,
        cl.reason, cl.notes, cl.created_at,
        u.full_name as moved_by_name
      FROM camera_locations cl
      LEFT JOIN users u ON cl.moved_by = u.id
      WHERE cl.camera_id = ${id}
      ORDER BY cl.valid_from DESC
    `;

    return c.json({ history });
  } catch (error) {
    console.error('Get camera history error:', error);
    return c.json({ error: 'Failed to fetch camera history' }, 500);
  }
});

export default cameras;
