import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';

const brands = new Hono();

// GET /brands - List all brands
brands.get('/', requireAuth, async (c) => {
    try {
        const result = await sql`
            SELECT id, name, code, created_at
            FROM camera_brands
            ORDER BY name
        `;
        return c.json({ brands: result });
    } catch (error) {
        console.error('List brands error:', error);
        return c.json({ error: 'Failed to fetch brands' }, 500);
    }
});

// POST /brands - Create brand (System Admin only)
brands.post('/', requireAuth, requireRole('System Admin'), async (c) => {
    try {
        const user = c.get('user');
        const { name, code } = await c.req.json();

        if (!name || !code) {
            return c.json({ error: 'Name and code are required' }, 400);
        }

        if (code.length !== 3) {
            return c.json({ error: 'Code must be exactly 3 characters' }, 400);
        }

        const [brand] = await sql`
            INSERT INTO camera_brands (name, code, created_by)
            VALUES (${name}, ${code.toUpperCase()}, ${user.userId})
            RETURNING id, name, code, created_at
        `;

        return c.json({ message: 'Brand created successfully', brand }, 201);
    } catch (error: any) {
        console.error('Create brand error:', error);
        if (error.code === '23505') {
            return c.json({ error: 'Brand name or code already exists' }, 409);
        }
        return c.json({ error: 'Failed to create brand' }, 500);
    }
});

// DELETE /brands/:id - Delete brand (System Admin only)
brands.delete('/:id', requireAuth, requireRole('System Admin'), async (c) => {
    try {
        const { id } = c.req.param();

        // Check if brand is used by any cameras
        const [inUse] = await sql`SELECT id FROM cameras WHERE brand_id = ${id} LIMIT 1`;
        if (inUse) {
            return c.json({ error: 'Cannot delete brand in use by cameras' }, 400);
        }

        const [brand] = await sql`
            DELETE FROM camera_brands WHERE id = ${id}
            RETURNING id
        `;

        if (!brand) {
            return c.json({ error: 'Brand not found' }, 404);
        }

        return c.json({ message: 'Brand deleted successfully' });
    } catch (error) {
        console.error('Delete brand error:', error);
        return c.json({ error: 'Failed to delete brand' }, 500);
    }
});

export default brands;
