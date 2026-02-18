import { Hono } from 'hono';
import { requireAuth, requireRoleLevel } from '../middleware/auth';
import minioClient, { getPresignedUrl, initMinio } from '../services/minio';
import { extractMetadata } from '../services/metadata';
import sql from '../db/connection';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const upload = new Hono();

// Initialize MinIO bucket on startup
initMinio();

// POST /upload/request - Get presigned URL for upload
upload.post('/request', requireAuth, requireRoleLevel(1), async (c) => {
    try {
        const user = c.get('user');
        const { filename, file_type, file_size, camera_id } = await c.req.json();

        if (!filename || !file_type || !file_size || !camera_id) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        // Validate camera exists and get hierarchy details
        const [camera] = await sql`
            SELECT 
                c.id, c.camera_id,
                d.name as div_name, r.name as rng_name, b.name as beat_name,
                cir.name as circle_name
            FROM cameras c
            LEFT JOIN divisions d ON c.division_id = d.id
            LEFT JOIN ranges r ON c.range_id = r.id
            LEFT JOIN beats b ON c.beat_id = b.id
            LEFT JOIN circles cir ON d.circle_id = cir.id
            WHERE c.id = ${camera_id}
        `;
        if (!camera) return c.json({ error: 'Camera not found' }, 404);

        // Sanitize names for path
        const sanitize = (s: string) => s?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
        const circle = sanitize(camera.circle_name);
        const div = sanitize(camera.div_name);
        const rng = sanitize(camera.rng_name);
        const beat = sanitize(camera.beat_name);
        const cam = sanitize(camera.camera_id);

        // Generate object path: Circle/Division/Range/Beat/Camera/Date/UUID.ext
        const date = new Date().toISOString().split('T')[0];
        const ext = filename.split('.').pop();
        const uuid = randomUUID();
        const objectName = `${circle}/${div}/${rng}/${beat}/${cam}/${date}/${uuid}.${ext}`;

        // Get presigned URL
        const url = await getPresignedUrl(objectName);

        return c.json({
            upload_url: url,
            file_path: objectName,
            uuid: uuid
        });
    } catch (error) {
        console.error('Upload request error:', error);
        return c.json({ error: 'Failed to generate upload URL' }, 500);
    }
});

// POST /upload/complete - Finalize upload and extract metadata
// Note: In a real production system, this might be triggered by MinIO webhook or separate worker
upload.post('/complete', requireAuth, requireRoleLevel(1), async (c) => {
    try {
        const user = c.get('user');
        const {
            file_path,
            camera_id,
            original_filename,
            file_size,
            mime_type
        } = await c.req.json();

        // 1. Verify file exists in MinIO
        // Note: MinIO JS client uses 'statObject' to check existence
        const bucketName = process.env.MINIO_BUCKET_NAME || 'wildvision-images';
        try {
            await minioClient.statObject(bucketName, file_path);
        } catch (err: any) {
            if (err.code === 'NotFound') {
                return c.json({ error: 'File not found in storage. Upload may have failed.' }, 404);
            }
            throw err;
        }

        // 2. Download file to memory to extract metadata
        // Warning: For very large files, stream processing is better, but images < 50MB are fine in memory for now
        const dataStream = await minioClient.getObject(bucketName, file_path);
        const chunks: Buffer[] = [];
        for await (const chunk of dataStream) {
            chunks.push(chunk as Buffer);
        }
        const buffer = Buffer.concat(chunks);

        // 3. Extract Metadata
        const metadata = await extractMetadata(buffer);
        console.log('Extracted Metadata:', metadata);

        // --- AI STUB START ---
        // Simulate species detection
        const speciesList = ['Tiger', 'Elephant', 'Leopard', 'Deer', 'Wild Boar', 'Bear', 'Unknown'];
        const detectedSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
        const confidence = Math.floor(Math.random() * (100 - 60) + 60); // Random 60-100%

        // Auto-verify if confidence > 90%
        const isAutoVerified = confidence > 90;
        const reviewStatus = isAutoVerified ? 'verified' : 'pending';

        // Enrich metadata
        (metadata as any).ai_prediction = {
            species: detectedSpecies,
            confidence: confidence,
            model_version: 'v1.0.0-stub'
        };
        if (isAutoVerified) {
            (metadata as any).auto_verified = true;
        }
        // --- AI STUB END ---

        // 4. Generate Thumbnail
        let thumbnailPath = null;
        try {
            const thumbnailBuffer = await sharp(buffer)
                .resize(300) // Width 300px, auto height
                .jpeg({ quality: 80 })
                .toBuffer();

            // Create thumbnail path: thumbnails/original_path_structure
            // original: division/range/cam/date/uuid.ext
            // thumbnail: thumbnails/division/range/cam/date/uuid.jpg
            thumbnailPath = `thumbnails/${file_path.replace(/\.[^/.]+$/, "")}.jpg`;

            await minioClient.putObject(
                bucketName,
                thumbnailPath,
                thumbnailBuffer,
                thumbnailBuffer.length,
                { 'Content-Type': 'image/jpeg' }
            );
            console.log('Thumbnail generated:', thumbnailPath);
        } catch (thumbError) {
            console.error('Thumbnail generation failed:', thumbError);
            // Don't fail the whole upload, just log it
        }

        // 5. Create DB Record
        const [image] = await sql`
            INSERT INTO images (
                camera_id, file_path, original_filename, file_size, mime_type,
                taken_at, uploaded_by, metadata, status,
                thumbnail_path, ai_confidence, review_status
            ) VALUES (
                ${camera_id}, ${file_path}, ${original_filename}, ${file_size}, ${mime_type},
                ${metadata.date_time_original || null}, ${user.userId}, ${sql.json(metadata as any)}, 'processed',
                ${thumbnailPath}, ${confidence}, ${reviewStatus}
            )
            RETURNING *
        `;

        return c.json({ message: 'Upload completed and processed', image }, 201);

    } catch (error) {
        console.error('Upload complete error:', error);
        return c.json({ error: 'Failed to complete upload' }, 500);
    }
});

export default upload;
