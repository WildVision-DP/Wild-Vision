import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRoleLevel } from '../middleware/auth';
import { predictAnimal } from '../services/ml-inference';
import { randomUUID } from 'crypto';

const images = new Hono();

// GET / - List all images with metadata and geography info
images.get('/', requireAuth, async (c) => {
    try {
        const { 
            confirmation_status = 'confirmed', 
            limit = '100', 
            offset = '0',
            sort = 'confirmed_at'
        } = c.req.query();

        const allowedStatuses = ['confirmed', 'pending_confirmation', 'rejected'];
        const status = allowedStatuses.includes(confirmation_status) ? confirmation_status : 'confirmed';
        const sortField = ['confirmed_at', 'detection_confidence', 'uploaded_at'].includes(sort) ? sort : 'confirmed_at';

        let query;
        
        if (sortField === 'confirmed_at') {
            query = await sql`
                SELECT 
                    i.id,
                    i.camera_id,
                    i.file_path,
                    i.thumbnail_path,
                    i.detected_animal,
                    i.detected_animal_scientific,
                    i.detection_confidence,
                    i.taken_at,
                    i.uploaded_at,
                    i.confirmed_at,
                    i.confirmed_by,
                    i.confirmation_status,
                    i.metadata,
                    c.camera_name as camera_name,
                    c.division_id,
                    c.range_id,
                    c.beat_id,
                    d.name as division_name,
                    d.circle_id,
                    r.name as range_name,
                    b.name as beat_name,
                    cir.name as circle_name
                FROM images i
                LEFT JOIN cameras c ON i.camera_id = c.id
                LEFT JOIN divisions d ON c.division_id = d.id
                LEFT JOIN ranges r ON c.range_id = r.id
                LEFT JOIN beats b ON c.beat_id = b.id
                LEFT JOIN circles cir ON d.circle_id = cir.id
                WHERE i.confirmation_status = ${status}
                ORDER BY i.confirmed_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        } else if (sortField === 'detection_confidence') {
            query = await sql`
                SELECT 
                    i.id,
                    i.camera_id,
                    i.file_path,
                    i.thumbnail_path,
                    i.detected_animal,
                    i.detected_animal_scientific,
                    i.detection_confidence,
                    i.taken_at,
                    i.uploaded_at,
                    i.confirmed_at,
                    i.confirmed_by,
                    i.confirmation_status,
                    i.metadata,
                    c.camera_name as camera_name,
                    c.division_id,
                    c.range_id,
                    c.beat_id,
                    d.name as division_name,
                    d.circle_id,
                    r.name as range_name,
                    b.name as beat_name,
                    cir.name as circle_name
                FROM images i
                LEFT JOIN cameras c ON i.camera_id = c.id
                LEFT JOIN divisions d ON c.division_id = d.id
                LEFT JOIN ranges r ON c.range_id = r.id
                LEFT JOIN beats b ON c.beat_id = b.id
                LEFT JOIN circles cir ON d.circle_id = cir.id
                WHERE i.confirmation_status = ${status}
                ORDER BY i.detection_confidence DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        } else {
            query = await sql`
                SELECT 
                    i.id,
                    i.camera_id,
                    i.file_path,
                    i.thumbnail_path,
                    i.detected_animal,
                    i.detected_animal_scientific,
                    i.detection_confidence,
                    i.taken_at,
                    i.uploaded_at,
                    i.confirmed_at,
                    i.confirmed_by,
                    i.confirmation_status,
                    i.metadata,
                    c.camera_name as camera_name,
                    c.division_id,
                    c.range_id,
                    c.beat_id,
                    d.name as division_name,
                    d.circle_id,
                    r.name as range_name,
                    b.name as beat_name,
                    cir.name as circle_name
                FROM images i
                LEFT JOIN cameras c ON i.camera_id = c.id
                LEFT JOIN divisions d ON c.division_id = d.id
                LEFT JOIN ranges r ON c.range_id = r.id
                LEFT JOIN beats b ON c.beat_id = b.id
                LEFT JOIN circles cir ON d.circle_id = cir.id
                WHERE i.confirmation_status = ${status}
                ORDER BY i.uploaded_at DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `;
        }
        
        const allImages = query;

        return c.json(allImages);
    } catch (error) {
        console.error('List images error:', error);
        return c.json({ error: 'Failed to fetch images' }, 500);
    }
});

// GET /cameras/:camera_id/images - List images for a camera
images.get('/camera/:camera_id', requireAuth, async (c) => {
    try {
        const { camera_id } = c.req.param();
        const { limit = '50', offset = '0' } = c.req.query();

        const images = await sql`
            SELECT 
                i.id, i.file_path, i.thumbnail_path, 
                i.taken_at, i.ai_confidence, i.review_status,
                i.metadata, i.created_at,
                u.full_name as uploaded_by_name
            FROM images i
            LEFT JOIN users u ON i.uploaded_by = u.id
            WHERE i.camera_id = ${camera_id} AND i.deleted_at IS NULL
            ORDER BY i.taken_at DESC NULLS LAST
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `;

        return c.json({ images });
    } catch (error) {
        console.error('List images error:', error);
        return c.json({ error: 'Failed to fetch images' }, 500);
    }
});

// PATCH /:id/verify - Verify/Reject image
images.patch('/:id/verify', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();
        const { status, remarks, species } = await c.req.json();
        const user = c.get('user');

        if (!['verified', 'rejected'].includes(status)) {
            return c.json({ error: 'Invalid status' }, 400);
        }

        const [image] = await sql`
            UPDATE images
            SET 
                review_status = ${status},
                reviewed_by = ${user.userId},
                reviewed_at = CURRENT_TIMESTAMP,
                review_remarks = ${remarks},
                metadata = jsonb_set(
                    metadata, 
                    '{manual_species}', 
                    ${JSON.stringify(species)}::jsonb
                )
            WHERE id = ${id}
            RETURNING *
        `;

        return c.json({ message: 'Image verified', image });
    } catch (error) {
        console.error('Verify image error:', error);
        return c.json({ error: 'Failed to verify image' }, 500);
    }
});

// POST /upload - Upload image and auto-detect animals with confidence-based auto-approval
images.post('/upload', requireAuth, async (c) => {
    try {
        const formData = await c.req.formData();
        const file = formData.get('file') as File;
        const cameraId = formData.get('camera_id') as string;

        if (!file || !cameraId) {
            return c.json({ error: 'Missing required fields: file, camera_id' }, 400);
        }

        // Verify camera exists
        const [camera] = await sql`
            SELECT id, latitude, longitude FROM cameras WHERE id = ${cameraId}
        `;

        if (!camera) {
            return c.json({ error: 'Camera not found' }, 404);
        }

        // Convert file to buffer
        const imageBuffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name;
        const user = c.get('user');

        // Run animal detection with confidence scoring
        const prediction = await predictAnimal(imageBuffer, fileName);
        
        // Determine auto-approval based on confidence (≥90%)
        const confidence = prediction.score || 0;
        const autoApproved = confidence >= 0.90;
        const detectionStatus = autoApproved ? 'auto_approved' : 'pending_review';

        const imageId = randomUUID();
        const filePath = `/images/${cameraId}/${new Date().toISOString().split('T')[0]}/${imageId}.jpg`;

        // Store image with detection results and auto-approval status
        const [image] = await sql`
            INSERT INTO images (
                id, camera_id, file_path, original_filename,
                file_size, mime_type, uploaded_at, status,
                detected_animal, detected_animal_scientific,
                detection_confidence, 
                auto_approved,
                detection_status,
                ml_metadata,
                uploaded_by
            ) VALUES (
                ${imageId},
                ${cameraId},
                ${filePath},
                ${fileName},
                ${imageBuffer.length},
                ${file.type},
                CURRENT_TIMESTAMP,
                'processed',
                ${prediction.label},
                ${prediction.scientific_name},
                ${confidence},
                ${autoApproved},
                ${detectionStatus}::"detection_status_enum",
                ${sql.json({
                    caption: prediction.caption,
                    confidence_score: confidence,
                    auto_approved: autoApproved,
                    method: prediction.method,
                    full_metadata: prediction.metadata,
                    processed_at: new Date().toISOString()
                })},
                ${user.userId}
            )
            RETURNING 
                id, camera_id, file_path, original_filename,
                detected_animal, detected_animal_scientific,
                detection_confidence, auto_approved, detection_status,
                uploaded_at
        `;

        const autoApprovedMsg = autoApproved 
            ? '✅ AUTO-APPROVED' 
            : '⏳ Pending review';

        console.log(`${autoApprovedMsg}: ${prediction.label} (${(confidence * 100).toFixed(2)}%)`);

        return c.json({
            image: {
                ...image,
                detection_confidence: parseFloat(image.detection_confidence),
                autoApproved: image.auto_approved,
                detectionStatus: image.detection_status
            }
        }, 201);

    } catch (error) {
        console.error('Image upload error:', error);
        return c.json({ error: 'Failed to upload image' }, 500);
    }
});

// GET /detections/summary - Get animal detection summary
images.get('/detections/summary', requireAuth, async (c) => {
    try {
        const divisionId = c.req.query('division_id');
        const rangeId = c.req.query('range_id');
        const beatId = c.req.query('beat_id');

        let whereClause = `
            WHERE detected_animal IS NOT NULL 
            AND detected_animal != 'Unknown'
            AND detected_animal != 'Service Unavailable'
        `;

        const params: any[] = [];
        let paramCount = 0;

        if (divisionId) {
            paramCount++;
            whereClause += ` AND camera_id IN (
                SELECT id FROM cameras WHERE division_id = $${paramCount}
            )`;
            params.push(divisionId);
        }

        if (rangeId) {
            paramCount++;
            whereClause += ` AND camera_id IN (
                SELECT id FROM cameras WHERE range_id = $${paramCount}
            )`;
            params.push(rangeId);
        }

        if (beatId) {
            paramCount++;
            whereClause += ` AND camera_id IN (
                SELECT id FROM cameras WHERE beat_id = $${paramCount}
            )`;
            params.push(beatId);
        }

        const detections = await sql.unsafe(`
            SELECT 
                detected_animal,
                COUNT(*) as count,
                AVG(CAST(detection_confidence AS FLOAT)) as avg_confidence,
                MAX(uploaded_at) as last_detected
            FROM images
            ${whereClause}
            GROUP BY detected_animal
            ORDER BY count DESC
        `, params);

        return c.json({
            detections: detections.map((d: any) => ({
                animal: d.detected_animal,
                count: parseInt(d.count),
                avg_confidence: parseFloat(d.avg_confidence).toFixed(4),
                last_detected: d.last_detected
            }))
        });

    } catch (error) {
        console.error('Detection summary error:', error);
        return c.json({ error: 'Failed to fetch detection summary' }, 500);
    }
});

export default images;
