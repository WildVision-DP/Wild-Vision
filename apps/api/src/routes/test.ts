import { Hono } from 'hono';
import { requireAuth, requireRole, requireRoleLevel, requirePermission } from '../middleware/auth';
import sql from '../db/connection';

const testRoutes = new Hono();

// Public route - no auth required
testRoutes.get('/public', (c) => {
    return c.json({ message: 'This is a public endpoint' });
});

// DEBUG: Test geography data endpoint (public - for testing only)
testRoutes.get('/geography-public', async (c) => {
    try {
        const circles = await sql`SELECT id, name, code FROM circles ORDER BY code`;
        const divisions = await sql`SELECT id, name, code, circle_id FROM divisions ORDER BY code`;
        const ranges = await sql`SELECT id, name, code, division_id FROM ranges ORDER BY code LIMIT 10`;
        const beats = await sql`SELECT id, name, code, range_id FROM beats ORDER BY code LIMIT 10`;

        return c.json({
            circles: { count: circles.length, data: circles },
            divisions: { count: divisions.length, data: divisions },
            ranges: { count: ranges.length, note: 'showing first 10', total: (await sql`SELECT COUNT(*) FROM ranges`)[0].count },
            beats: { count: beats.length, note: 'showing first 10', total: (await sql`SELECT COUNT(*) FROM beats`)[0].count },
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch data', details: error.message }, 500);
    }
});

// DEBUG: Test raw JSON parsing
testRoutes.post('/test-json', async (c) => {
    try {
        const text = await c.req.text();
        console.log('Raw body:', text);
        console.log('Raw body length:', text.length);
        console.log('Content-Type:', c.req.header('content-type'));
        
        const json = JSON.parse(text);
        return c.json({ received: json, bodyLength: text.length });
    } catch (error: any) {
        return c.json({ error: error.message, bodyReceived: true }, 400);
    }
});

// Protected route - requires authentication
testRoutes.get('/protected', requireAuth, (c) => {
    const user = c.get('user');
    return c.json({
        message: 'This is a protected endpoint',
        user: {
            id: user.id,
            email: user.email,
            role: user.roleName,
        },
    });
});

// Admin only route
testRoutes.get('/admin-only', requireAuth, requireRole('Admin'), (c) => {
    return c.json({ message: 'This is an admin-only endpoint' });
});

// Divisional Officer or higher
testRoutes.get('/divisional-or-higher', requireAuth, requireRoleLevel(2), (c) => {
    const user = c.get('user');
    return c.json({
        message: 'This endpoint requires Divisional Officer level or higher',
        userLevel: user.roleLevel,
    });
});

// Permission-based route
testRoutes.get('/cameras', requireAuth, requirePermission('cameras', 'view'), (c) => {
    return c.json({ message: 'Camera list (requires view permission)' });
});

export default testRoutes;
