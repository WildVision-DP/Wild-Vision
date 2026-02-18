import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRoleLevel } from '../middleware/auth';

const images = new Hono();

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

export default images;
