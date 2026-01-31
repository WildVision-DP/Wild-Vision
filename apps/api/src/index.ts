import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth';
import testRoutes from './routes/test';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Routes
app.get('/', (c) => {
    return c.json({
        message: 'WildVision API - Wildlife Surveillance & Movement Analytics Platform',
        version: '1.0.0',
    });
});

app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'WildVision API',
    });
});

// Auth routes
app.route('/auth', authRoutes);

// Test routes for middleware
app.route('/test', testRoutes);

const port = process.env.API_PORT || 4000;

console.log(`🐅 WildVision API running on http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};
