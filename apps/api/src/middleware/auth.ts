import { Context, Next } from 'hono';
import { verifyToken, JWTPayload } from '../utils/jwt';
import sql from '../db/connection';

// Extend Hono context to include user
declare module 'hono' {
    interface ContextVariableMap {
        user: JWTPayload & {
            id: string;
            email: string;
            fullName: string;
            isActive: boolean;
        };
    }
}

/**
 * Middleware to verify JWT token and attach user to context
 */
export async function requireAuth(c: Context, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }

    // Get full user info from database
    const [user] = await sql`
    SELECT u.id, u.email, u.full_name, u.is_active, u.role_id,
           r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ${payload.userId} AND u.deleted_at IS NULL
  `;

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    if (!user.is_active) {
        return c.json({ error: 'Account is inactive' }, 403);
    }

    // Attach user to context
    c.set('user', {
        ...payload,
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isActive: user.is_active,
    });

    await next();
}

/**
 * Middleware to require specific role
 */
export function requireRole(...allowedRoles: string[]) {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            return c.json({ error: 'Authentication required' }, 401);
        }

        if (!allowedRoles.includes(user.roleName)) {
            return c.json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: user.roleName,
            }, 403);
        }

        await next();
    };
}

/**
 * Middleware to require minimum role level
 * Lower level number = higher privilege (Admin = 1, Ground Staff = 4)
 */
export function requireRoleLevel(maxLevel: number) {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            return c.json({ error: 'Authentication required' }, 401);
        }

        if (user.roleLevel > maxLevel) {
            return c.json({
                error: 'Insufficient role level',
                required: `Level ${maxLevel} or higher`,
                current: `Level ${user.roleLevel}`,
            }, 403);
        }

        await next();
    };
}

/**
 * Middleware to check specific permission
 */
export function requirePermission(resource: string, action: string) {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            return c.json({ error: 'Authentication required' }, 401);
        }

        // Check if user's role has the required permission
        const [permission] = await sql`
      SELECT p.id
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ${user.roleId}
      AND p.resource = ${resource}
      AND p.action = ${action}
    `;

        if (!permission) {
            return c.json({
                error: 'Permission denied',
                required: `${action} on ${resource}`,
            }, 403);
        }

        await next();
    };
}

/**
 * Middleware to check hierarchy access (circle/division/range/beat)
 */
export function requireHierarchyAccess(hierarchyLevel: 'circle' | 'division' | 'range' | 'beat') {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            return c.json({ error: 'Authentication required' }, 401);
        }

        // Admins have access to all hierarchy levels
        if (user.roleName === 'Admin') {
            await next();
            return;
        }

        // Get user's hierarchy assignments
        const assignments = await sql`
      SELECT circle_id, division_id, range_id, beat_id
      FROM user_assignments
      WHERE user_id = ${user.id} AND is_primary = true
    `;

        if (assignments.length === 0) {
            return c.json({ error: 'No hierarchy assignment found' }, 403);
        }

        // Check if user has access to the requested hierarchy level
        const assignment = assignments[0];
        let hasAccess = false;

        switch (hierarchyLevel) {
            case 'circle':
                hasAccess = !!assignment.circle_id;
                break;
            case 'division':
                hasAccess = !!assignment.division_id;
                break;
            case 'range':
                hasAccess = !!assignment.range_id;
                break;
            case 'beat':
                hasAccess = !!assignment.beat_id;
                break;
        }

        if (!hasAccess) {
            return c.json({
                error: 'Hierarchy access denied',
                required: hierarchyLevel,
            }, 403);
        }

        // Attach hierarchy info to context
        c.set('hierarchy', assignment);

        await next();
    };
}

/**
 * Middleware to check if user can access specific resource by ID
 * Validates that the resource belongs to user's hierarchy
 */
export function requireResourceAccess(resourceType: 'circle' | 'division' | 'range' | 'beat', idParam: string = 'id') {
    return async (c: Context, next: Next) => {
        const user = c.get('user');

        if (!user) {
            return c.json({ error: 'Authentication required' }, 401);
        }

        // Admins have access to all resources
        if (user.roleName === 'Admin') {
            await next();
            return;
        }

        const resourceId = c.req.param(idParam);
        if (!resourceId) {
            return c.json({ error: 'Resource ID required' }, 400);
        }

        // Get user's hierarchy assignments
        const [assignment] = await sql`
      SELECT circle_id, division_id, range_id, beat_id
      FROM user_assignments
      WHERE user_id = ${user.id} AND is_primary = true
    `;

        if (!assignment) {
            return c.json({ error: 'No hierarchy assignment found' }, 403);
        }

        // Check if resource belongs to user's hierarchy
        let hasAccess = false;

        switch (resourceType) {
            case 'circle':
                hasAccess = assignment.circle_id === resourceId;
                break;
            case 'division':
                hasAccess = assignment.division_id === resourceId;
                break;
            case 'range':
                hasAccess = assignment.range_id === resourceId;
                break;
            case 'beat':
                hasAccess = assignment.beat_id === resourceId;
                break;
        }

        if (!hasAccess) {
            return c.json({
                error: 'Resource access denied',
                message: `You do not have access to this ${resourceType}`,
            }, 403);
        }

        await next();
    };
}
