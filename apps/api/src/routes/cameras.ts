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
        c.id, c.camera_id, c.camera_name, c.latitude::float, c.longitude::float, c.camera_model, 
        c.serial_number, c.install_date, c.status, c.notes,
        c.brand_id, c.beat_id,
        d.id as division_id, d.name as division_name, d.circle_id,
        r.id as range_id, r.name as range_name,
        b.name as beat_name,
        cb.name as brand_name,
        c.created_at, c.updated_at
      FROM cameras c
      LEFT JOIN beats b ON c.beat_id = b.id
      LEFT JOIN ranges r ON b.range_id = r.id
      LEFT JOIN divisions d ON r.division_id = d.id
      LEFT JOIN camera_brands cb ON c.brand_id = cb.id
      WHERE c.deleted_at IS NULL
    `;

    // Apply filters
    const filters = [];
    if (status) filters.push(sql`c.status = ${status}`);
    if (division_id) filters.push(sql`d.id = ${division_id}`);
    if (range_id) filters.push(sql`r.id = ${range_id}`);
    if (beat_id) filters.push(sql`c.beat_id = ${beat_id}`);

    // Apply hierarchy restrictions for non-admin users
    if (user.roleName !== 'Admin') {
      const [assignment] = await sql`
        SELECT division_id, range_id, beat_id 
        FROM user_assignments 
        WHERE user_id = ${user.userId} AND is_primary = true
      `;
      if (assignment) {
        if (assignment.division_id) filters.push(sql`d.id = ${assignment.division_id}`);
        if (assignment.range_id) filters.push(sql`r.id = ${assignment.range_id}`);
        if (assignment.beat_id) filters.push(sql`c.beat_id = ${assignment.beat_id}`);
      }
    }

    const result = await sql`
      ${query}
      ${filters.length > 0 ? filters.reduce((acc, curr) => sql`${acc} AND ${curr}`, sql`AND (TRUE)`) : sql``}
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
    return c.json({ error: 'Failed to fetch cameras', details: (error as any).message }, 500);
  }
});

// GET /cameras/activity - Last image date per camera (used in reports)
cameras.get('/activity', requireAuth, async (c) => {
  try {
    const activity = await sql`
      SELECT
        c.id                      as camera_id,
        MAX(i.uploaded_at)::text  as last_upload,
        MAX(i.taken_at)::text     as last_taken,
        COUNT(i.id)::int          as image_count
      FROM cameras c
      LEFT JOIN images i ON i.camera_id = c.id
      WHERE c.deleted_at IS NULL
      GROUP BY c.id
    `;
    return c.json({ activity });
  } catch (error) {
    console.error('Camera activity error:', error);
    return c.json({ error: 'Failed to fetch activity' }, 500);
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
        d.name as division_name, d.circle_id,
        r.name as range_name, 
        b.name as beat_name,
        cb.name as brand_name,
        u.full_name as created_by_name
      FROM cameras c
      LEFT JOIN divisions d ON c.division_id = d.id
      LEFT JOIN ranges r ON c.range_id = r.id
      LEFT JOIN beats b ON c.beat_id = b.id
      LEFT JOIN camera_brands cb ON c.brand_id = cb.id
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
      camera_id,
      camera_name,
      brand_id,
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
    if (!camera_id || !latitude || !longitude) {
      return c.json({ error: 'camera_id, latitude, and longitude are required' }, 400);
    }

    // Check if camera_id already exists
    const [existing] = await sql`SELECT id FROM cameras WHERE camera_id = ${camera_id}`;
    if (existing) {
      return c.json({ error: 'Camera ID already exists' }, 409);
    }

    // Cast empty strings and undefined to null
    const divId = division_id || null;
    const rngId = range_id || null;
    const btId = beat_id || null;
    const camModel = camera_model || null;
    const serialNum = serial_number || null;
    const installDt = install_date || null;
    const notesTxt = notes || null;
    const camName = camera_name || null;
    const brandId = brand_id || null;

    const [camera] = await sql`
      INSERT INTO cameras (
        camera_id, camera_name, brand_id, division_id, range_id, beat_id,
        latitude, longitude, camera_model, serial_number,
        install_date, status, notes, created_by
      ) VALUES (
        ${camera_id}, ${camName}, ${brandId}, ${divId}, ${rngId}, ${btId},
        ${latitude}, ${longitude}, ${camModel}, ${serialNum},
        ${installDt}, ${status}, ${notesTxt}, ${user.userId}
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

    const [camera] = await sql`
      UPDATE cameras SET
        camera_name = COALESCE(${updates.camera_name || null}, camera_name),
        brand_id = COALESCE(${updates.brand_id || null}, brand_id),
        camera_model = COALESCE(${updates.camera_model}, camera_model),
        serial_number = COALESCE(${updates.serial_number}, serial_number),
        status = COALESCE(${updates.status}, status),
        notes = COALESCE(${updates.notes}, notes),
        install_date = COALESCE(${updates.install_date}, install_date),
        division_id = COALESCE(${updates.division_id || null}, division_id),
        range_id = COALESCE(${updates.range_id || null}, range_id),
        beat_id = COALESCE(${updates.beat_id || null}, beat_id)
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;

    if (!camera) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    // Log audit
    await sql`
      INSERT INTO audit_logs (user_id, action, metadata)
      VALUES (${user.userId}, 'camera_updated', ${JSON.stringify({ camera_id: id })})
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

// GET /cameras/:id/analytics - Get detection analytics for a camera
cameras.get('/:id/analytics', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const { timeframe = '30' } = c.req.query(); // 30 days default
    const days = Math.max(1, Math.min(365, parseInt(timeframe) || 30));

    // Build cutoff date in JS to avoid INTERVAL interpolation issues
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get camera details
    const [camera] = await sql`
      SELECT id, camera_id, camera_name, status
      FROM cameras
      WHERE id = ${id}
    `;

    if (!camera) {
      return c.json({ error: 'Camera not found' }, 404);
    }

    // Get detection summary for this camera — use COALESCE so images without EXIF taken_at are still counted
    const [summary] = await sql`
      SELECT 
        COUNT(*) as total_detections,
        COUNT(CASE WHEN confirmation_status = 'confirmed' THEN 1 END) as confirmed_detections,
        COUNT(CASE WHEN confirmation_status = 'pending_confirmation' THEN 1 END) as pending_detections,
        COUNT(CASE WHEN confirmation_status = 'rejected' THEN 1 END) as rejected_detections,
        MAX(COALESCE(taken_at, uploaded_at)) as last_detection,
        AVG(CAST(detection_confidence as FLOAT)) as avg_confidence
      FROM images
      WHERE camera_id = ${id}
      AND COALESCE(taken_at, uploaded_at) > ${cutoffDate}
    `;

    // Get animal counts for this camera
    const animalCounts = await sql`
      SELECT 
        detected_animal as animal,
        detected_animal_scientific as scientific_name,
        COUNT(*) as count,
        AVG(CAST(detection_confidence as FLOAT)) as avg_confidence,
        MAX(COALESCE(taken_at, uploaded_at)) as last_seen
      FROM images
      WHERE camera_id = ${id}
      AND confirmation_status = 'confirmed'
      AND detected_animal IS NOT NULL
      AND COALESCE(taken_at, uploaded_at) > ${cutoffDate}
      GROUP BY detected_animal, detected_animal_scientific
      ORDER BY count DESC
    `;

    // Get auto-approved vs manual approved breakdown
    const [approvalBreakdown] = await sql`
      SELECT 
        COUNT(*) as total_approved,
        COUNT(CASE WHEN auto_approved = true THEN 1 END) as auto_approved,
        COUNT(CASE WHEN auto_approved = false THEN 1 END) as manual_approved
      FROM images
      WHERE camera_id = ${id}
      AND confirmation_status = 'confirmed'
      AND COALESCE(taken_at, uploaded_at) > ${cutoffDate}
    `;

    return c.json({
      camera: {
        id: camera.id,
        camera_id: camera.camera_id,
        camera_name: camera.camera_name,
        status: camera.status
      },
      analytics: {
        timeframe_days: days,
        total_detections: parseInt(summary.total_detections) || 0,
        confirmed_detections: parseInt(summary.confirmed_detections) || 0,
        pending_detections: parseInt(summary.pending_detections) || 0,
        rejected_detections: parseInt(summary.rejected_detections) || 0,
        average_confidence: summary.avg_confidence ? parseFloat(summary.avg_confidence) : 0,
        last_detection: summary.last_detection,
        animals: animalCounts.map((row: any) => ({
          name: row.animal,
          scientific_name: row.scientific_name,
          count: parseInt(row.count) || 0,
          avg_confidence: row.avg_confidence ? parseFloat(row.avg_confidence) : 0,
          last_seen: row.last_seen
        })),
        approval_breakdown: {
          total_approved: parseInt(approvalBreakdown.total_approved) || 0,
          auto_approved: parseInt(approvalBreakdown.auto_approved) || 0,
          manual_approved: parseInt(approvalBreakdown.manual_approved) || 0
        }
      }
    });
  } catch (error) {
    console.error('Get camera analytics error:', error);
    return c.json({ error: 'Failed to fetch camera analytics' }, 500);
  }
});

export default cameras;
