/**
 * Admin Review Routes
 * Endpoints for admin/forest officer review of low-confidence detections
 */

import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRoleLevel } from '../middleware/auth';
import { randomUUID } from 'crypto';

const admin = new Hono();

/**
 * GET /admin/reviews
 * List pending detection reviews (low confidence, no auto-approval)
 * Role: Admin, Forest Officer (level ≥2)
 */
admin.get('/reviews', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const {
            limit = '20',
            offset = '0',
            sort = 'uploaded_at',
            animal_filter = '',
            status_filter = 'pending_confirmation',
            confidence_min = '0',
            confidence_max = '90'
        } = c.req.query();

        const allowedSorts = ['uploaded_at', 'detection_confidence', 'camera_name'];
        const sortField = allowedSorts.includes(sort) ? sort : 'uploaded_at';
        const statusFilter = status_filter === 'all' ? null : status_filter;

        let whereClause = 'WHERE i.auto_approved = false AND i.detected_animal IS NOT NULL';

        if (statusFilter) {
            whereClause += ` AND i.confirmation_status = '${statusFilter}'`;
        }

        if (animal_filter) {
            whereClause += ` AND LOWER(i.detected_animal) LIKE LOWER('%${animal_filter}%')`;
        }

        const confidenceMinVal = parseFloat(confidence_min) || 0;
        const confidenceMaxVal = parseFloat(confidence_max) || 10000;
        whereClause += ` AND CAST(i.detection_confidence AS FLOAT) BETWEEN ${confidenceMinVal} AND ${confidenceMaxVal}`;

        const orderClause = sortField === 'uploaded_at'
            ? 'ORDER BY i.uploaded_at DESC'
            : sortField === 'detection_confidence'
                ? 'ORDER BY CAST(i.detection_confidence AS FLOAT) DESC'
                : 'ORDER BY c.camera_name ASC, i.uploaded_at DESC';

        const reviews = await sql.unsafe(`
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
                i.confirmation_status,
                i.confirmed_by,
                i.confirmed_at,
                i.metadata,
                c.camera_name,
                c.division_id,
                c.range_id,
                c.beat_id,
                c.latitude,
                c.longitude,
                d.name as division_name,
                d.circle_id,
                r.name as range_name,
                b.name as beat_name,
                cir.name as circle_name,
                u.full_name as uploaded_by_name,
                ru.full_name as confirmed_by_name
            FROM images i
            LEFT JOIN cameras c ON i.camera_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN ranges r ON c.range_id = r.id
            LEFT JOIN beats b ON c.beat_id = b.id
            LEFT JOIN circles cir ON d.circle_id = cir.id
            LEFT JOIN users u ON i.uploaded_by = u.id
            LEFT JOIN users ru ON i.confirmed_by = ru.id
            ${whereClause}
            ${orderClause}
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `);

        // Get total count
        const countResult = await sql.unsafe(`
            SELECT COUNT(*) as total FROM images i
            LEFT JOIN cameras c ON i.camera_id = c.id
            ${whereClause}
        `);

        return c.json({
            reviews: reviews.map((r: any) => ({
                ...r,
                detection_confidence: parseFloat(r.detection_confidence)
            })),
            total: parseInt(countResult[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        console.error('List reviews error:', error);
        return c.json({ error: 'Failed to fetch reviews' }, 500);
    }
});

/**
 * GET /admin/reviews/:id
 * Get detailed review information for a single detection
 */
admin.get('/reviews/:id', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();

        const [review] = await sql`
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
                i.confirmation_status,
                i.confirmed_by,
                i.confirmed_at,
                i.metadata,
                i.ml_metadata,
                c.camera_name,
                c.division_id,
                c.range_id,
                c.beat_id,
                c.latitude,
                c.longitude,
                d.name as division_name,
                d.circle_id,
                r.name as range_name,
                b.name as beat_name,
                cir.name as circle_name,
                u.full_name as uploaded_by_name,
                u.id as uploaded_by_id,
                ru.full_name as confirmed_by_name,
                ru.id as confirmed_by_id
            FROM images i
            LEFT JOIN cameras c ON i.camera_id = c.id
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN ranges r ON c.range_id = r.id
            LEFT JOIN beats b ON c.beat_id = b.id
            LEFT JOIN circles cir ON d.circle_id = cir.id
            LEFT JOIN users u ON i.uploaded_by = u.id
            LEFT JOIN users ru ON i.confirmed_by = ru.id
            WHERE i.id = ${id}
        `;

        if (!review) {
            return c.json({ error: 'Review not found' }, 404);
        }

        return c.json({
            review: {
                ...review,
                detection_confidence: parseFloat(review.detection_confidence)
            }
        });

    } catch (error) {
        console.error('Get review error:', error);
        return c.json({ error: 'Failed to fetch review' }, 500);
    }
});

/**
 * POST /admin/reviews/:id/approve
 * Approve a detection (manual approval)
 */
admin.post('/reviews/:id/approve', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();
        const body = await c.req.json() as {
            animal?: string;  // Allow editing the animal name
            notes?: string;
        };

        const user = c.get('user');
        const userId = user.id || user.userId;

        // Get the current image
        const [image] = await sql`
            SELECT id, detected_animal, detection_confidence, metadata
            FROM images
            WHERE id = ${id}
        `;

        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }

        // Approve the detection
        const [updated] = await sql`
            UPDATE images
            SET 
                confirmation_status = 'confirmed',
                detected_animal = COALESCE(${body.animal ?? null}, detected_animal),
                confirmed_by = ${userId},
                confirmed_at = CURRENT_TIMESTAMP,
                metadata = COALESCE(metadata, '{}'::jsonb) || 
                           jsonb_build_object('review_notes', ${body.notes || ''})
            WHERE id = ${id}
            RETURNING 
                id, detected_animal, detection_confidence, 
                confirmation_status, confirmed_by, confirmed_at
        `;

        console.log(`✅ Detection approved: ${updated.detected_animal} by ${user.username}`);

        return c.json({
            message: 'Detection approved',
            image: {
                ...updated,
                detection_confidence: parseFloat(updated.detection_confidence)
            }
        });

    } catch (error) {
        console.error('Approve review error:', error);
        return c.json({ error: 'Failed to approve review', details: error.message }, 500);
    }
});

/**
 * POST /admin/reviews/:id/reject
 * Reject a detection
 */
admin.post('/reviews/:id/reject', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();
        const body = await c.req.json() as {
            reason?: string;
            notes?: string;
        };

        const user = c.get('user');
        const userId = user.id || user.userId;

        // Get the current image
        const [image] = await sql`
            SELECT id, detected_animal FROM images WHERE id = ${id}
        `;

        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }

        // Reject the detection
        const [updated] = await sql`
            UPDATE images
            SET 
                confirmation_status = 'rejected',
                confirmed_by = ${userId},
                confirmed_at = CURRENT_TIMESTAMP,
                metadata = COALESCE(metadata, '{}'::jsonb) || 
                           jsonb_build_object(
                               'rejection_reason', ${body.reason || 'No reason provided'},
                               'review_notes', ${body.notes || ''}
                           )
            WHERE id = ${id}
            RETURNING id, detected_animal, confirmation_status, confirmed_by, confirmed_at
        `;

        console.log(`❌ Detection rejected: ${image.detected_animal} by ${user.username}`);

        return c.json({
            message: 'Detection rejected',
            image: updated
        });

    } catch (error) {
        console.error('Reject review error:', error);
        return c.json({ error: 'Failed to reject review' }, 500);
    }
});

/**
 * POST /admin/reviews/:id/reassess
 * Reassess a detection (move back to pending review)
 */
admin.post('/reviews/:id/reassess', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();
        const body = await c.req.json() as {
            notes?: string;
        };

        const [updated] = await sql`
            UPDATE images
            SET 
                confirmation_status = 'pending_confirmation',
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{reassessment_notes}',
                    ${JSON.stringify(body.notes || '')}::jsonb
                )
            WHERE id = ${id}
            RETURNING id, detected_animal, confirmation_status
        `;

        if (!updated) {
            return c.json({ error: 'Image not found' }, 404);
        }

        console.log(`🔄 Detection moved to review: ${updated.detected_animal}`);

        return c.json({
            message: 'Detection reassessed',
            image: updated
        });

    } catch (error) {
        console.error('Reassess review error:', error);
        return c.json({ error: 'Failed to reassess review' }, 500);
    }
});

/**
 * GET /admin/reviews/stats/summary
 * Get statistics on pending reviews
 */
admin.get('/stats/summary', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const stats = await sql`
            SELECT 
                i.confirmation_status,
                COUNT(*) as count,
                AVG(CAST(i.detection_confidence AS FLOAT)) as avg_confidence,
                MIN(CAST(i.detection_confidence AS FLOAT)) as min_confidence,
                MAX(CAST(i.detection_confidence AS FLOAT)) as max_confidence
            FROM images i
            GROUP BY i.confirmation_status
            ORDER BY i.confirmation_status
        `;

        // Count by animal
        const animalStats = await sql`
            SELECT 
                detected_animal,
                COUNT(*) as count,
                i.confirmation_status,
                AVG(CAST(i.detection_confidence AS FLOAT)) as avg_confidence
            FROM images i
            WHERE detected_animal IS NOT NULL 
            AND detected_animal != 'Unknown'
            AND auto_approved = false
            GROUP BY detected_animal, i.confirmation_status
            ORDER BY count DESC
            LIMIT 10
        `;

        return c.json({
            overall: stats.map((s: any) => ({
                status: s.confirmation_status,
                count: parseInt(s.count),
                avg_confidence: parseFloat(s.avg_confidence || '0').toFixed(4),
                min_confidence: parseFloat(s.min_confidence || '0').toFixed(4),
                max_confidence: parseFloat(s.max_confidence || '0').toFixed(4)
            })),
            by_animal: animalStats.map((a: any) => ({
                animal: a.detected_animal,
                status: a.confirmation_status,
                count: parseInt(a.count),
                avg_confidence: parseFloat(a.avg_confidence || '0').toFixed(4)
            }))
        });

    } catch (error) {
        console.error('Stats summary error:', error);
        return c.json({ error: 'Failed to fetch statistics' }, 500);
    }
});

export default admin;
