import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import minioClient from '../services/minio';

const proxy = new Hono();

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'wildvision-images';

// GET /proxy?key=path/to/image.jpg - Proxy images from MinIO
proxy.get('/', async (c) => {
    try {
        const key = c.req.query('key');
        
        if (!key) {
            return c.json({ error: 'Missing key parameter' }, 400);
        }

        // Get object from MinIO
        const dataStream = await minioClient.getObject(BUCKET_NAME, key);

        // Determine content type from file extension
        const ext = key.split('.').pop()?.toLowerCase();
        const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                          ext === 'png' ? 'image/png' :
                          ext === 'gif' ? 'image/gif' :
                          ext === 'webp' ? 'image/webp' :
                          'application/octet-stream';

        // Set headers
        c.header('Content-Type', contentType);
        c.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        // Stream the response
        return stream(c, async (stream) => {
            for await (const chunk of dataStream) {
                await stream.write(chunk);
            }
        });

    } catch (error: any) {
        console.error('Proxy error:', error);
        
        if (error.code === 'NoSuchKey') {
            return c.json({ error: 'Image not found' }, 404);
        }
        
        return c.json({ error: 'Failed to fetch image' }, 500);
    }
});

export default proxy;
