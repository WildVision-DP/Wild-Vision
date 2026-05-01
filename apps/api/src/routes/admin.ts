/**
 * Admin Review Routes
 * Endpoints for admin/forest officer review of low-confidence detections
 */

import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRoleLevel } from '../middleware/auth';

const admin = new Hono();
const AUTO_APPROVE_CONFIDENCE = Number(process.env.ML_AUTO_APPROVE_CONFIDENCE || 80);

type CanonicalStatus = 'pending_confirmation' | 'confirmed' | 'rejected';
const REVIEW_AUDIT_ACTIONS = [
    'detection_auto_approved',
    'detection_pending_confirmation',
    'detection_confirmed',
    'detection_manual_approved',
    'detection_rejected',
    'detection_reassessed',
    'detection_undo',
];

function normalizeStatusFilter(status: string): CanonicalStatus | null {
    const legacyMap: Record<string, CanonicalStatus | null> = {
        all: null,
        pending_review: 'pending_confirmation',
        pending_confirmation: 'pending_confirmation',
        manual_approved: 'confirmed',
        auto_approved: 'confirmed',
        verified: 'confirmed',
        confirmed: 'confirmed',
        rejected: 'rejected',
    };

    return Object.prototype.hasOwnProperty.call(legacyMap, status)
        ? legacyMap[status]
        : 'pending_confirmation';
}

function normalizeConfidencePercent(value: unknown): number {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    const percent = parsed <= 1 ? parsed * 100 : parsed;
    return Math.max(0, Math.min(100, Math.round(percent)));
}

async function logDetectionAudit(
    userId: string | null,
    action: string,
    metadata: Record<string, unknown>
) {
    try {
        await sql`
            INSERT INTO audit_logs (user_id, action, metadata)
            VALUES (${userId}, ${action}, ${sql.json(metadata as any)})
        `;
    } catch (err) {
        console.warn('[audit] Failed to write detection audit log:', err);
    }
}

async function getDetectionAudit(id: string) {
    const logs = await sql`
        SELECT
            al.id,
            al.action,
            al.metadata,
            al.created_at,
            u.full_name as user_name,
            u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.action = ANY(${REVIEW_AUDIT_ACTIONS})
          AND (
              al.metadata->>'image_id' = ${id}
              OR al.metadata->>'detection_id' = ${id}
          )
        ORDER BY al.created_at DESC
    `;

    return logs.map((entry: any) => ({
        id: entry.id,
        action: entry.action,
        metadata: entry.metadata || {},
        created_at: entry.created_at,
        user_name: entry.user_name || 'System',
        user_email: entry.user_email || null,
    }));
}

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
            sort_order = 'desc',
            animal_filter = '',
            status_filter = 'pending_confirmation',
            confidence_min = '0',
            confidence_max = '90'
        } = c.req.query();

        const allowedSorts = ['uploaded_at', 'detection_confidence', 'camera_name'];
        const sortField = allowedSorts.includes(sort) ? sort : 'uploaded_at';
        const orderDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
        const statusFilter = normalizeStatusFilter(status_filter);

        let whereClause = 'WHERE i.auto_approved = false AND i.detected_animal IS NOT NULL';
        const params: any[] = [];

        if (statusFilter) {
            params.push(statusFilter);
            whereClause += ` AND i.confirmation_status = $${params.length}`;
        }

        if (animal_filter) {
            params.push(`%${animal_filter}%`);
            whereClause += ` AND LOWER(i.detected_animal) LIKE LOWER($${params.length})`;
        }

        const confidenceMinVal = parseFloat(confidence_min) || 0;
        const confidenceMaxVal = parseFloat(confidence_max) || 100;
        params.push(confidenceMinVal);
        whereClause += ` AND CAST(i.detection_confidence AS FLOAT) >= $${params.length}`;
        params.push(confidenceMaxVal);
        whereClause += ` AND CAST(i.detection_confidence AS FLOAT) <= $${params.length}`;

        const orderClause = sortField === 'uploaded_at'
            ? `ORDER BY i.uploaded_at ${orderDirection}`
            : sortField === 'detection_confidence'
                ? `ORDER BY CAST(i.detection_confidence AS FLOAT) ${orderDirection}`
                : `ORDER BY c.camera_name ${orderDirection}, i.uploaded_at DESC`;

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
        `, params);

        // Get total count
        const countResult = await sql.unsafe(`
            SELECT COUNT(*) as total FROM images i
            LEFT JOIN cameras c ON i.camera_id = c.id
            ${whereClause}
        `, params);

        return c.json({
            reviews: reviews.map((r: any) => ({
                ...r,
                detection_confidence: normalizeConfidencePercent(r.detection_confidence)
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
                detection_confidence: normalizeConfidencePercent(review.detection_confidence)
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
            SELECT id, detected_animal, detection_confidence, confirmation_status, metadata
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
                auto_approved = false,
                approval_method = 'manual_approved',
                detected_animal = COALESCE(${body.animal ?? null}, detected_animal),
                confirmed_by = ${userId},
                confirmed_at = CURRENT_TIMESTAMP,
                metadata = COALESCE(metadata, '{}'::jsonb) || 
                           jsonb_build_object(
                               'review_notes', ${body.notes || ''},
                               'original_detected_animal', ${image.detected_animal},
                               'corrected_detected_animal', COALESCE(${body.animal ?? null}, detected_animal)
                           )
            WHERE id = ${id}
            RETURNING 
                id, detected_animal, detection_confidence, 
                confirmation_status, confirmed_by, confirmed_at
        `;

        console.log(`Detection approved: ${updated.detected_animal} by ${user.fullName || user.email}`);

        await logDetectionAudit(userId, 'detection_manual_approved', {
            image_id: id,
            previous_animal: image.detected_animal,
            animal: updated.detected_animal,
            previous_status: image.confirmation_status,
            new_status: updated.confirmation_status,
            confidence_percent: updated.detection_confidence,
            notes: body.notes || '',
        });

        return c.json({
            message: 'Detection approved',
            image: {
                ...updated,
                detection_confidence: normalizeConfidencePercent(updated.detection_confidence)
            }
        });

    } catch (error: any) {
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
            SELECT id, detected_animal, detection_confidence, confirmation_status FROM images WHERE id = ${id}
        `;

        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }

        // Reject the detection
        const [updated] = await sql`
            UPDATE images
            SET 
                confirmation_status = 'rejected',
                auto_approved = false,
                approval_method = 'manual_rejected',
                confirmed_by = ${userId},
                confirmed_at = CURRENT_TIMESTAMP,
                metadata = COALESCE(metadata, '{}'::jsonb) || 
                           jsonb_build_object(
                               'rejection_reason', ${body.reason || 'No reason provided'},
                               'review_notes', ${body.notes || ''}
                           )
            WHERE id = ${id}
            RETURNING id, detected_animal, detection_confidence, confirmation_status, confirmed_by, confirmed_at
        `;

        console.log(`Detection rejected: ${image.detected_animal} by ${user.fullName || user.email}`);

        await logDetectionAudit(userId, 'detection_rejected', {
            image_id: id,
            animal: image.detected_animal,
            confidence_percent: image.detection_confidence,
            previous_status: image.confirmation_status,
            new_status: updated.confirmation_status,
            reason: body.reason || 'No reason provided',
            notes: body.notes || '',
            source: 'admin_review',
        });

        return c.json({
            message: 'Detection rejected',
            image: updated
        });

    } catch (error: any) {
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
        const user = c.get('user');
        const userId = user.id || user.userId;

        const [image] = await sql`
            SELECT id, detected_animal, detection_confidence, confirmation_status
            FROM images
            WHERE id = ${id}
        `;

        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }

        const [updated] = await sql`
            UPDATE images
            SET 
                confirmation_status = 'pending_confirmation',
                auto_approved = false,
                approval_method = null,
                metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{reassessment_notes}',
                    ${JSON.stringify(body.notes || '')}::jsonb
                )
            WHERE id = ${id}
            RETURNING id, detected_animal, detection_confidence, confirmation_status
        `;

        if (!updated) {
            return c.json({ error: 'Image not found' }, 404);
        }

        console.log(`🔄 Detection moved to review: ${updated.detected_animal}`);

        await logDetectionAudit(userId, 'detection_reassessed', {
            image_id: id,
            animal: updated.detected_animal,
            confidence_percent: updated.detection_confidence,
            previous_status: image.confirmation_status,
            new_status: updated.confirmation_status,
            notes: body.notes || '',
        });

        return c.json({
            message: 'Detection reassessed',
            image: updated
        });

    } catch (error: any) {
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
                avg_confidence: normalizeConfidencePercent(s.avg_confidence),
                min_confidence: normalizeConfidencePercent(s.min_confidence),
                max_confidence: normalizeConfidencePercent(s.max_confidence)
            })),
            by_animal: animalStats.map((a: any) => ({
                animal: a.detected_animal,
                status: a.confirmation_status,
                count: parseInt(a.count),
                avg_confidence: normalizeConfidencePercent(a.avg_confidence)
            }))
        });

    } catch (error) {
        console.error('Stats summary error:', error);
        return c.json({ error: 'Failed to fetch statistics' }, 500);
    }
});

async function detectionAuditResponse(c: any, id: string) {
    const audit = await getDetectionAudit(id);
    const latestReviewAction = audit.find(entry =>
        ['detection_manual_approved', 'detection_rejected', 'detection_reassessed'].includes(entry.action)
    );
    const latestAt = latestReviewAction ? new Date(latestReviewAction.created_at).getTime() : 0;
    const canUndo =
        Boolean(latestReviewAction) &&
        Date.now() - latestAt <= 24 * 60 * 60 * 1000;

    return c.json({
        audit,
        undo: {
            can_undo: canUndo,
            latest_action: latestReviewAction?.action || null,
            latest_at: latestReviewAction?.created_at || null,
            window_hours: 24,
        },
    });
}

admin.get('/reviews/:id/audit', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();
        return detectionAuditResponse(c, id);
    } catch (error) {
        console.error('Get review audit error:', error);
        return c.json({ error: 'Failed to fetch audit history' }, 500);
    }
});

admin.get('/detections/:id/audit', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();
        return detectionAuditResponse(c, id);
    } catch (error) {
        console.error('Get detection audit error:', error);
        return c.json({ error: 'Failed to fetch audit history' }, 500);
    }
});

admin.post('/reviews/:id/undo', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { id } = c.req.param();
        const user = c.get('user');
        const userId = user.id || user.userId;
        const audit = await getDetectionAudit(id);
        const latestReviewAction = audit.find(entry =>
            ['detection_manual_approved', 'detection_rejected', 'detection_reassessed'].includes(entry.action)
        );

        if (!latestReviewAction) {
            return c.json({ error: 'No review action found to undo' }, 404);
        }

        const latestAt = new Date(latestReviewAction.created_at).getTime();
        if (Date.now() - latestAt > 24 * 60 * 60 * 1000) {
            return c.json({ error: 'Undo window expired', window_hours: 24 }, 400);
        }

        const [image] = await sql`
            SELECT id, detected_animal, confirmation_status, detection_confidence
            FROM images
            WHERE id = ${id}
        `;

        if (!image) {
            return c.json({ error: 'Image not found' }, 404);
        }

        const previousAnimal =
            latestReviewAction.metadata?.previous_animal ||
            latestReviewAction.metadata?.original_detected_animal ||
            image.detected_animal;

        const [updated] = await sql`
            UPDATE images
            SET
                confirmation_status = 'pending_confirmation',
                auto_approved = false,
                approval_method = null,
                confirmed_by = null,
                confirmed_at = null,
                detected_animal = ${previousAnimal},
                metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                    'undo_notes', ${`Undid ${latestReviewAction.action}`},
                    'undo_at', CURRENT_TIMESTAMP
                )
            WHERE id = ${id}
            RETURNING id, detected_animal, detection_confidence, confirmation_status
        `;

        await logDetectionAudit(userId, 'detection_undo', {
            image_id: id,
            undone_action: latestReviewAction.action,
            previous_status: image.confirmation_status,
            new_status: updated.confirmation_status,
            previous_animal: image.detected_animal,
            animal: updated.detected_animal,
            confidence_percent: updated.detection_confidence,
        });

        return c.json({
            message: 'Latest verification action undone',
            image: {
                ...updated,
                detection_confidence: normalizeConfidencePercent(updated.detection_confidence),
            },
        });
    } catch (error) {
        console.error('Undo review error:', error);
        return c.json({ error: 'Failed to undo review action' }, 500);
    }
});

/**
 * GET /admin/stats/ml
 * Model/inference metrics for the BLIP detection workflow.
 */
admin.get('/stats/ml', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const [row] = await sql`
            SELECT
                COUNT(*)::int as total_inferences,
                COUNT(*) FILTER (WHERE auto_approved = true)::int as auto_approved,
                COUNT(*) FILTER (
                    WHERE auto_approved = false AND confirmation_status = 'confirmed'
                )::int as manual_confirmed,
                COUNT(*) FILTER (WHERE confirmation_status = 'pending_confirmation')::int as pending_confirmation,
                COUNT(*) FILTER (WHERE confirmation_status = 'rejected')::int as rejected,
                COUNT(*) FILTER (
                    WHERE detected_animal IS NULL
                       OR detected_animal IN ('Unknown', 'Service Unavailable')
                       OR COALESCE(metadata->'ai_prediction'->>'fallback', 'false') = 'true'
                )::int as failed_or_fallback,
                AVG(CAST(detection_confidence AS FLOAT)) as average_confidence
            FROM images
            WHERE detected_animal IS NOT NULL
               OR metadata ? 'ai_prediction'
        `;

        const total = Number(row?.total_inferences || 0);
        const autoApproved = Number(row?.auto_approved || 0);
        const failedOrFallback = Number(row?.failed_or_fallback || 0);

        return c.json({
            model: {
                provider: 'BLIP',
                version: 'blip-v1',
                confidence_unit: 'percent',
                auto_approve_threshold_percent: AUTO_APPROVE_CONFIDENCE,
            },
            metrics: {
                total_inferences: total,
                auto_approved: autoApproved,
                manual_confirmed: Number(row?.manual_confirmed || 0),
                pending_confirmation: Number(row?.pending_confirmation || 0),
                rejected: Number(row?.rejected || 0),
                failed_or_fallback: failedOrFallback,
                average_confidence_percent: normalizeConfidencePercent(row?.average_confidence),
                auto_approval_rate_percent: total ? Number(((autoApproved / total) * 100).toFixed(2)) : 0,
                fallback_rate_percent: total ? Number(((failedOrFallback / total) * 100).toFixed(2)) : 0,
            },
        });
    } catch (error) {
        console.error('ML stats error:', error);
        return c.json({ error: 'Failed to fetch ML statistics' }, 500);
    }
});

admin.get('/stats/verification', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const [summary] = await sql`
            SELECT
                COUNT(*) FILTER (
                    WHERE al.action IN ('detection_manual_approved', 'detection_rejected', 'detection_reassessed')
                )::int as total_actions,
                COUNT(*) FILTER (WHERE al.action = 'detection_manual_approved')::int as approved,
                COUNT(*) FILTER (WHERE al.action = 'detection_rejected')::int as rejected,
                COUNT(*) FILTER (WHERE al.action = 'detection_reassessed')::int as reassessed,
                COUNT(*) FILTER (
                    WHERE al.metadata ? 'previous_animal'
                      AND al.metadata ? 'animal'
                      AND al.metadata->>'previous_animal' IS DISTINCT FROM al.metadata->>'animal'
                )::int as corrected_species,
                AVG(EXTRACT(EPOCH FROM (al.created_at - i.uploaded_at)) / 60)
                    FILTER (WHERE i.uploaded_at IS NOT NULL) as avg_review_minutes
            FROM audit_logs al
            LEFT JOIN images i ON i.id::text = al.metadata->>'image_id'
            WHERE al.action = ANY(${REVIEW_AUDIT_ACTIONS})
        `;

        const byOfficer = await sql`
            SELECT
                COALESCE(u.full_name, 'System') as officer_name,
                u.email as officer_email,
                COUNT(*)::int as action_count,
                COUNT(*) FILTER (WHERE al.action = 'detection_manual_approved')::int as approved,
                COUNT(*) FILTER (WHERE al.action = 'detection_rejected')::int as rejected,
                COUNT(*) FILTER (WHERE al.action = 'detection_reassessed')::int as reassessed,
                AVG(EXTRACT(EPOCH FROM (al.created_at - i.uploaded_at)) / 60)
                    FILTER (WHERE i.uploaded_at IS NOT NULL) as avg_review_minutes
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN images i ON i.id::text = al.metadata->>'image_id'
            WHERE al.action IN ('detection_manual_approved', 'detection_rejected', 'detection_reassessed')
            GROUP BY u.full_name, u.email
            ORDER BY action_count DESC
        `;

        const totalActions = Number(summary?.total_actions || 0);
        const correctedSpecies = Number(summary?.corrected_species || 0);

        return c.json({
            summary: {
                total_actions: totalActions,
                approved: Number(summary?.approved || 0),
                rejected: Number(summary?.rejected || 0),
                reassessed: Number(summary?.reassessed || 0),
                corrected_species: correctedSpecies,
                correction_rate_percent: totalActions
                    ? Number(((correctedSpecies / totalActions) * 100).toFixed(2))
                    : 0,
                avg_review_minutes: Number(Number(summary?.avg_review_minutes || 0).toFixed(2)),
            },
            by_officer: byOfficer.map((row: any) => ({
                officer_name: row.officer_name,
                officer_email: row.officer_email,
                action_count: Number(row.action_count || 0),
                approved: Number(row.approved || 0),
                rejected: Number(row.rejected || 0),
                reassessed: Number(row.reassessed || 0),
                avg_review_minutes: Number(Number(row.avg_review_minutes || 0).toFixed(2)),
            })),
        });
    } catch (error) {
        console.error('Verification stats error:', error);
        return c.json({ error: 'Failed to fetch verification statistics' }, 500);
    }
});

admin.get('/reports/verification', requireAuth, requireRoleLevel(2), async (c) => {
    try {
        const { limit = '500' } = c.req.query();
        const rows = await sql`
            SELECT
                al.created_at,
                al.action,
                COALESCE(u.full_name, 'System') as officer_name,
                u.email as officer_email,
                al.metadata->>'image_id' as image_id,
                i.camera_id,
                c.camera_name,
                al.metadata->>'previous_animal' as original_animal,
                al.metadata->>'animal' as final_animal,
                al.metadata->>'previous_status' as previous_status,
                al.metadata->>'new_status' as new_status,
                al.metadata->>'reason' as reason,
                al.metadata->>'notes' as notes
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN images i ON i.id::text = al.metadata->>'image_id'
            LEFT JOIN cameras c ON i.camera_id = c.id
            WHERE al.action IN ('detection_manual_approved', 'detection_rejected', 'detection_reassessed', 'detection_undo')
            ORDER BY al.created_at DESC
            LIMIT ${Math.min(parseInt(limit) || 500, 2000)}
        `;

        return c.json({
            generated_at: new Date().toISOString(),
            rows,
        });
    } catch (error) {
        console.error('Verification report error:', error);
        return c.json({ error: 'Failed to generate verification report' }, 500);
    }
});

export default admin;
