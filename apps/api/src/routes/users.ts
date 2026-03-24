import { Hono } from 'hono';
import sql from '../db/connection';
import { requireAuth, requireRole } from '../middleware/auth';
import { hashPassword } from '../utils/password';

const users = new Hono();

// GET /users/roles - List all roles
users.get('/roles', requireAuth, async (c) => {
    try {
        const roles = await sql`SELECT id, name, level, description FROM roles ORDER BY level`;
        return c.json({ roles });
    } catch (error) {
        console.error('List roles error:', error);
        return c.json({ error: 'Failed to fetch roles' }, 500);
    }
});

// GET /users - List all users
users.get('/', requireAuth, async (c) => {
    try {
        const result = await sql`
            SELECT 
                u.id, u.email, u.full_name, u.role_id, u.is_active, u.last_login, u.created_at,
                r.name as role_name, r.level as role_level
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.deleted_at IS NULL
            ORDER BY u.created_at DESC
        `;
        return c.json({ users: result });
    } catch (error) {
        console.error('List users error:', error);
        return c.json({ error: 'Failed to fetch users' }, 500);
    }
});

// POST /users - Create new user
users.post('/', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { email, password, fullName, roleId } = await c.req.json();

        if (!email || !password || !fullName || !roleId) {
            return c.json({ error: 'All fields are required' }, 400);
        }

        const [existing] = await sql`SELECT id FROM users WHERE email = ${email} AND deleted_at IS NULL`;
        if (existing) {
            return c.json({ error: 'User already exists' }, 409);
        }

        const passwordHash = await hashPassword(password);

        const [user] = await sql`
      INSERT INTO users (email, password_hash, full_name, role_id)
      VALUES (${email}, ${passwordHash}, ${fullName}, ${roleId})
      RETURNING id, email, full_name, role_id, created_at
    `;

        return c.json({ message: 'User created successfully', user }, 201);
    } catch (error) {
        console.error('Create user error:', error);
        return c.json({ error: 'Failed to create user' }, 500);
    }
});

// PUT /users/:id - Update user
users.put('/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();
        const { fullName, roleId, isActive, password } = await c.req.json();

        const updates: any = {};
        if (fullName) updates.full_name = fullName;
        if (roleId) updates.role_id = roleId;
        if (isActive !== undefined) updates.is_active = isActive;
        if (password) {
            const hash = await hashPassword(password);
            updates.password_hash = hash;
        }

        if (Object.keys(updates).length === 0) {
            return c.json({ message: 'No changes provided' });
        }

        updates.updated_at = sql`CURRENT_TIMESTAMP`;

        const [user] = await sql`
      UPDATE users SET ${sql(updates)}
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, email, full_name, is_active
    `;

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        return c.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update user error:', error);
        return c.json({ error: 'Failed to update user' }, 500);
    }
});

// DELETE /users/:id - Hard delete user (except sys admin)
users.delete('/:id', requireAuth, requireRole('Admin'), async (c) => {
    try {
        const { id } = c.req.param();
        const currentUser = c.get('user');

        if (id === currentUser.userId) {
            return c.json({ error: 'Cannot delete your own account' }, 400);
        }

        // Check if user is sys admin
        const [targetUser] = await sql`
            SELECT u.id, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.id = ${id} AND u.deleted_at IS NULL
        `;

        if (!targetUser) {
            return c.json({ error: 'User not found' }, 404);
        }

        if (targetUser.role_name === 'System Admin') {
            return c.json({ error: 'Cannot delete system admin' }, 403);
        }

        // Hard delete user
        await sql`DELETE FROM users WHERE id = ${id}`;

        return c.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        return c.json({ error: 'Failed to delete user' }, 500);
    }
});

export default users;
