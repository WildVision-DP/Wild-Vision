import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors());

// Health check endpoint
app.get('/health', (c: Context) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'WildVision API',
    });
});

// Root endpoint
app.get('/', (c: Context) => {
    return c.json({
        message: 'WildVision API - Wildlife Surveillance & Movement Analytics Platform',
        version: '1.0.0',
    });
});

const port = process.env.PORT || 4000;

console.log(`🐅 WildVision API running on http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};
