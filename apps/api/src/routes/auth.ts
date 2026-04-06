import { Hono } from 'hono';
import sql from '../db/connection';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateTokens, verifyToken } from '../utils/jwt';
import { createHash } from 'crypto';

const auth = new Hono();

// Helper to hash tokens for storage
function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

// Helper to get client info
function getClientInfo(c: any) {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
    return {
        ipAddress: ip || null, // Use null for INET type compatibility
        userAgent: c.req.header('user-agent') || 'unknown',
        deviceFingerprint: c.req.header('x-device-fingerprint') || null,
    };
}

// POST /auth/register
auth.post('/register', async (c) => {
    try {
        const { email, password, fullName, roleId } = await c.req.json();

        // Validate input
        if (!email || !password || !fullName || !roleId) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        // Check if user already exists
        const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existing.length > 0) {
            return c.json({ error: 'User already exists' }, 409);
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const [user] = await sql`
      INSERT INTO users (email, password_hash, full_name, role_id)
      VALUES (${email}, ${passwordHash}, ${fullName}, ${roleId})
      RETURNING id, email, full_name, role_id, created_at
    `;

        // Log audit
        const clientInfo = getClientInfo(c);
        await sql`
      INSERT INTO audit_logs (user_id, action, ip_address, user_agent, device_fingerprint)
      VALUES (${user.id}, 'register', ${clientInfo.ipAddress}, ${clientInfo.userAgent}, ${clientInfo.deviceFingerprint})
    `;

        return c.json({
            message: 'User registered successfully',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
            },
        }, 201);
    } catch (error) {
        console.error('Registration error:', error);
        return c.json({ error: 'Registration failed' }, 500);
    }
});

// POST /auth/login
auth.post('/login', async (c) => {
    try {
        let body;
        try {
            body = await c.req.json();
        } catch (jsonError: any) {
            console.error('JSON parse error details:', {
                message: jsonError.message,
                error: jsonError.toString(),
                contentType: c.req.header('content-type'),
            });
            return c.json({ error: 'Invalid JSON in request body', details: jsonError.message }, 400);
        }

        const { email, password } = body;

        if (!email || !password) {
            return c.json({ error: 'Email and password required' }, 400);
        }

        // Get user with role info
        const [user] = await sql`
      SELECT u.id, u.email, u.password_hash, u.full_name, u.role_id, u.is_active,
             r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.email = ${email} AND u.deleted_at IS NULL
    `;

        if (!user) {
            // Log failed login
            const clientInfo = getClientInfo(c);
            await sql`
        INSERT INTO audit_logs (action, ip_address, user_agent, device_fingerprint, metadata)
        VALUES ('failed_login', ${clientInfo.ipAddress}, ${clientInfo.userAgent}, ${clientInfo.deviceFingerprint}, 
                ${JSON.stringify({ email, reason: 'user_not_found' })})
      `;
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        if (!user.is_active) {
            return c.json({ error: 'Account is inactive' }, 403);
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            // Log failed login
            const clientInfo = getClientInfo(c);
            await sql`
        INSERT INTO audit_logs (user_id, action, ip_address, user_agent, device_fingerprint, metadata)
        VALUES (${user.id}, 'failed_login', ${clientInfo.ipAddress}, ${clientInfo.userAgent}, ${clientInfo.deviceFingerprint},
                ${JSON.stringify({ reason: 'invalid_password' })})
      `;
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        // Generate tokens
        const tokens = generateTokens({
            userId: user.id,
            email: user.email,
            roleId: user.role_id,
            roleName: user.role_name,
        });

        // Store session
        const clientInfo = getClientInfo(c);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await sql`
      INSERT INTO sessions (user_id, access_token_hash, refresh_token_hash, device_fingerprint, ip_address, user_agent, expires_at)
      VALUES (${user.id}, ${hashToken(tokens.accessToken)}, ${hashToken(tokens.refreshToken)}, 
              ${clientInfo.deviceFingerprint}, ${clientInfo.ipAddress}, ${clientInfo.userAgent}, ${expiresAt})
    `;

        // Update last login
        await sql`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ${user.id}`;

        // Log successful login
        await sql`
      INSERT INTO audit_logs (user_id, action, ip_address, user_agent, device_fingerprint)
      VALUES (${user.id}, 'login', ${clientInfo.ipAddress}, ${clientInfo.userAgent}, ${clientInfo.deviceFingerprint})
    `;

        return c.json({
            message: 'Login successful',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role_name,
            },
        });
    } catch (error: any) {
        console.error('Login error:', error);
        return c.json({ error: 'Login failed', details: error.message, stack: error.stack }, 500);
    }
});

// POST /auth/refresh
auth.post('/refresh', async (c) => {
    try {
        const { refreshToken } = await c.req.json();

        if (!refreshToken) {
            return c.json({ error: 'Refresh token required' }, 400);
        }

        // Verify token
        const payload = verifyToken(refreshToken);
        if (!payload) {
            return c.json({ error: 'Invalid or expired refresh token' }, 401);
        }

        // Check if session exists and is active
        const [session] = await sql`
      SELECT id FROM sessions 
      WHERE refresh_token_hash = ${hashToken(refreshToken)} 
      AND is_active = true 
      AND expires_at > CURRENT_TIMESTAMP
    `;

        if (!session) {
            return c.json({ error: 'Session not found or expired' }, 401);
        }

        // Generate new tokens
        const tokens = generateTokens(payload);

        // Update session with new tokens
        await sql`
      UPDATE sessions 
      SET access_token_hash = ${hashToken(tokens.accessToken)},
          refresh_token_hash = ${hashToken(tokens.refreshToken)}
      WHERE id = ${session.id}
    `;

        // Log token refresh
        const clientInfo = getClientInfo(c);
        await sql`
      INSERT INTO audit_logs (user_id, action, ip_address, user_agent, device_fingerprint)
      VALUES (${payload.userId}, 'refresh_token', ${clientInfo.ipAddress}, ${clientInfo.userAgent}, ${clientInfo.deviceFingerprint})
    `;

        return c.json({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return c.json({ error: 'Token refresh failed' }, 500);
    }
});

// POST /auth/logout
auth.post('/logout', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'No token provided' }, 401);
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (payload) {
            // Deactivate session
            await sql`
        UPDATE sessions 
        SET is_active = false, logged_out_at = CURRENT_TIMESTAMP
        WHERE access_token_hash = ${hashToken(token)}
      `;

            // Log logout
            const clientInfo = getClientInfo(c);
            await sql`
        INSERT INTO audit_logs (user_id, action, ip_address, user_agent, device_fingerprint)
        VALUES (${payload.userId}, 'logout', ${clientInfo.ipAddress}, ${clientInfo.userAgent}, ${clientInfo.deviceFingerprint})
      `;
        }

        return c.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        return c.json({ error: 'Logout failed' }, 500);
    }
});

// GET /auth/me
auth.get('/me', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.json({ error: 'No token provided' }, 401);
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (!payload) {
            return c.json({ error: 'Invalid or expired token' }, 401);
        }

        // Get user info
        const [user] = await sql`
      SELECT u.id, u.email, u.full_name, u.is_active, u.created_at, u.last_login,
             r.name as role_name, r.level as role_level
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = ${payload.userId} AND u.deleted_at IS NULL
    `;

        if (!user) {
            return c.json({ error: 'User not found' }, 404);
        }

        return c.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role_name,
                roleLevel: user.role_level,
                isActive: user.is_active,
                lastLogin: user.last_login,
                createdAt: user.created_at,
            },
        });
    } catch (error) {
        console.error('Get current user error:', error);
        return c.json({ error: 'Failed to get user info' }, 500);
    }
});

export default auth;
