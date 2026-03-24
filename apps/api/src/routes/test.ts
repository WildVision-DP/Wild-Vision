import { Hono } from 'hono';
import { requireAuth, requireRole, requireRoleLevel, requirePermission } from '../middleware/auth';

const testRoutes = new Hono();

// Public route - no auth required
testRoutes.get('/public', (c) => {
    return c.json({ message: 'This is a public endpoint' });
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
