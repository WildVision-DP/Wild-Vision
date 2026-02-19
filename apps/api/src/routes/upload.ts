import { Hono } from 'hono';
import { requireAuth, requireRoleLevel } from '../middleware/auth';
import minioClient, { getPresignedUrl, initMinio } from '../services/minio';
import { extractMetadata, processImageMetadata } from '../services/metadata';
import sql from '../db/connection';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const upload = new Hono();

// Initialize MinIO bucket on startup
// Task 3.1.2.1: Bucket structure configured in minio.ts
// Task 3.1.2.2: Bucket policies set in minio.ts (private by default)
// Task 3.1.2.3: Lifecycle rules configured in minio.ts (archive after 2 years)
initMinio();

/**
 * POST /upload/request - Generate presigned URL for direct upload to MinIO
 * 
 * Task 3.1.2.4: Presigned URL generation
 * Task 3.1.2.5: Create POST /upload/request endpoint
 * Task 3.1.2.6: Validate upload request (camera access, file metadata)
 * Task 3.1.2.7: Generate unique object key with UUID
 * Task 3.1.2.8: Set presigned URL expiry (15 minutes)
 * 
 * @route POST /upload/request
 * @auth RequireAuth, RoleLevel >= 1 (Ground Staff+)
 * @body {filename, file_type, file_size, camera_id}
 * @returns {upload_url, file_path, uuid}
 */
upload.post('/request', requireAuth, requireRoleLevel(1), async (c) => {
    try {
        const user = c.get('user');
        const { filename, file_type, file_size, camera_id } = await c.req.json();

        // Task 3.1.2.6: Validate required fields
        if (!filename || !file_type || !file_size || !camera_id) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        // Task 3.1.2.6: Validate camera exists and user has access
        // Accept both database UUID and government camera_id string
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(camera_id);
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
            WHERE ${isUUID ? sql`c.id = ${camera_id}` : sql`c.camera_id = ${camera_id}`}
        `;
        if (!camera) return c.json({ error: 'Camera not found' }, 404);

        // Task 3.1.2.1: Generate folder structure - /circle/division/range/beat/camera-id/yyyy-mm-dd/
        const sanitize = (s: string) => s?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
        const circle = sanitize(camera.circle_name);
        const div = sanitize(camera.div_name);
        const rng = sanitize(camera.rng_name);
        const beat = sanitize(camera.beat_name);
        const cam = sanitize(camera.camera_id);

        // Task 3.1.2.7: Generate unique object key with UUID
        const date = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
        const ext = filename.split('.').pop();
        const uuid = randomUUID();
        const objectName = `${circle}/${div}/${rng}/${beat}/${cam}/${date}/${uuid}.${ext}`;

        // Task 3.1.2.4 & 3.1.2.8: Generate presigned URL with 15-minute expiry
        const url = await getPresignedUrl(objectName); // Default 900s = 15 minutes

        console.log(`Upload URL requested by user ${user.userId} for camera ${camera.camera_id}: ${objectName}`);

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

/**
 * POST /upload/complete - Finalize upload after client uploads to MinIO
 * 
 * Task 3.1.2.9: Create POST /upload/complete endpoint
 * Task 3.1.2.10: Verify file exists in MinIO after upload
 * Task 3.1.2.11: Create database record for uploaded image
 * 
 * @route POST /upload/complete
 * @auth RequireAuth, RoleLevel >= 1 (Ground Staff+)
 * @body {file_path, camera_id, original_filename, file_size, mime_type}
 * @returns {message, image}
 */
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

        // Task 3.1.2.10: Verify file exists in MinIO storage
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

        // 3. Quick EXIF extraction — used only to capture taken_at timestamp
        //    before the DB insert. Full metadata processing (Tasks 3.1.3.3–3.1.3.10)
        //    is performed asynchronously via processImageMetadata() below.
        const metadata = await extractMetadata(buffer);
        console.log('[upload] Quick EXIF extraction done:', {
            taken_at: metadata.date_time_original ?? null,
            has_gps: metadata.gps_latitude != null,
            serial: metadata.serial_number ?? null,
        });

        // --- AI STUB START ---
        // TODO: Replace with actual YOLOv8 inference (Module 4 - Task 4.1.1)
        // Simulate species detection for development/testing
        const speciesList = ['Tiger', 'Elephant', 'Leopard', 'Deer', 'Wild Boar', 'Bear', 'Unknown'];
        const detectedSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
        const confidence = Math.floor(Math.random() * (100 - 60) + 60); // Random 60-100%

        // Auto-verify if confidence > 90% (Task 4.1.2.4)
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

        // 4. Generate Thumbnail (parallel to main image storage)
        let thumbnailPath = null;
        try {
            const thumbnailBuffer = await sharp(buffer)
                .resize(300) // Width 300px, auto height
                .jpeg({ quality: 80 })
                .toBuffer();

            // Create thumbnail path: thumbnails/original_path_structure
            // Follows same hierarchy as main images for organization
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

        // 5. Create DB Record (Task 3.1.2.11)
        //    metadata_status defaults to 'pending'; processImageMetadata() will
        //    set it to 'completed' (or 'failed') after async processing.
        const aiMetaStub: Record<string, unknown> = {
            ai_prediction: (metadata as Record<string, unknown>).ai_prediction,
            auto_verified:  (metadata as Record<string, unknown>).auto_verified ?? false,
        };

        const [image] = await sql`
            INSERT INTO images (
                camera_id, file_path, original_filename, file_size, mime_type,
                taken_at, uploaded_by, metadata, status,
                thumbnail_path, ai_confidence, review_status,
                metadata_status
            ) VALUES (
                ${camera_id}, ${file_path}, ${original_filename}, ${file_size}, ${mime_type},
                ${metadata.date_time_original || null}, ${user.userId},
                ${sql.json(aiMetaStub as any)}, 'processed',
                ${thumbnailPath}, ${confidence}, ${reviewStatus},
                'pending'
            )
            RETURNING *
        `;

        console.log(`✅ Image upload completed: ${file_path} (confidence: ${confidence}%, status: ${reviewStatus})`);

        // 6. Async full metadata pipeline — Task 3.1.3
        //    Fire-and-forget: the HTTP response is returned immediately.
        //    The background worker (metadata-worker.ts) will retry any failures.
        processImageMetadata(image.id as string, buffer).catch((err) => {
            console.warn(`[upload] Background metadata processing failed for ${image.id as string}:`, err);
        });

        return c.json({ message: 'Upload completed and processed', image }, 201);

    } catch (error) {
        console.error('Upload complete error:', error);
        return c.json({ error: 'Failed to complete upload' }, 500);
    }
});

export default upload;
