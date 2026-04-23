import { Hono } from 'hono';
import type { Context } from 'hono';
import { requireAuth, requireRoleLevel } from '../middleware/auth';
import minioClient, { getPresignedUrl, initMinio } from '../services/minio';
import { extractMetadata, processImageMetadata } from '../services/metadata';
import sql from '../db/connection';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

const upload = new Hono();

initMinio();

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT = 30000;

type DetectionResult = {
    label: string;
    scientific_name: string;
    score: number;
};

type BLIPResponse = {
    caption: string;
    animal: string;
    confidence: number;
    method: string;
    metadata?: any;
};

type CameraRow = {
    id: string;
    camera_id: string;
    div_name: string | null;
    rng_name: string | null;
    beat_name: string | null;
    circle_name: string | null;
};

async function getCameraWithHierarchy(camera_id: string): Promise<CameraRow | undefined> {
    const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            camera_id
        );
    const query = isUUID
        ? sql`SELECT c.id, c.camera_id, d.name as div_name, r.name as rng_name, b.name as beat_name, cir.name as circle_name FROM cameras c LEFT JOIN beats b ON c.beat_id = b.id LEFT JOIN ranges r ON b.range_id = r.id LEFT JOIN divisions d ON r.division_id = d.id LEFT JOIN circles cir ON d.circle_id = cir.id WHERE c.id = ${camera_id}`
        : sql`SELECT c.id, c.camera_id, d.name as div_name, r.name as rng_name, b.name as beat_name, cir.name as circle_name FROM cameras c LEFT JOIN beats b ON c.beat_id = b.id LEFT JOIN ranges r ON b.range_id = r.id LEFT JOIN divisions d ON r.division_id = d.id LEFT JOIN circles cir ON d.circle_id = cir.id WHERE c.camera_id = ${camera_id}`;
    const [row] = await query;
    return row as CameraRow | undefined;
}

function buildObjectName(camera: CameraRow, filename: string): string {
    const sanitize = (s: string | null | undefined) =>
        (s ?? '').replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
    const date = new Date().toISOString().split('T')[0];
    const ext = filename.split('.').pop() || 'bin';
    const uuid = randomUUID();
    const camKey =
        camera.camera_id != null && String(camera.camera_id).trim() !== ''
            ? String(camera.camera_id)
            : String(camera.id);
    return `${sanitize(camera.circle_name)}/${sanitize(camera.div_name)}/${sanitize(camera.rng_name)}/${sanitize(camera.beat_name)}/${sanitize(camKey)}/${date}/${uuid}.${ext}`;
}

/**
 * Call the ML service for animal detection (multipart body matches actual image type).
 */
async function detectAnimal(
    buffer: Buffer,
    mimeType = 'image/jpeg'
): Promise<DetectionResult | null> {
    try {
        const safeMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
        
        const blob = new Blob([buffer], { type: safeMime });
        const formData = new FormData();
        
        // Ensure Bun knows it's a file by passing an object with name
        formData.append('file', new File([blob], 'upload.jpg', { type: safeMime }));

        console.log(
            `[ML] Sending image (${buffer.length} bytes, ${safeMime}) to: ${ML_SERVICE_URL}/predict`
        );
        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: 'POST',
            body: formData,
            signal: AbortSignal.timeout(ML_TIMEOUT),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ ML Service error ${response.status}:`, errorText);
            return null;
        }

        const responseText = await response.text();
        let blipResult: BLIPResponse;
        try {
            blipResult = JSON.parse(responseText) as BLIPResponse;
        } catch (e) {
            console.error(`❌ Failed to parse ML response JSON:`, e);
            return null;
        }

        return {
            label: blipResult.animal,
            scientific_name: `${blipResult.animal.toLowerCase()}-sp`,
            score: blipResult.confidence,
        };
    } catch (err) {
        console.error('❌ [ML] Detection fetch failed:', err);
        return null;
    }
}

/**
 * After bytes are in MinIO: EXIF → ML → thumbnail → DB row (pending_confirmation).
 */
async function runMlAndPersist(
    c: Context,
    opts: {
        user: { userId: string };
        actualCameraId: string;
        file_path: string;
        original_filename: string;
        file_size: number;
        mime_type: string;
        buffer: Buffer;
    }
) {
    const {
        user,
        actualCameraId,
        file_path,
        original_filename,
        file_size,
        mime_type,
        buffer,
    } = opts;

    const bucketName = process.env.MINIO_BUCKET_NAME || 'wildvision-images';

    let metadata: any = {};
    try {
        metadata = await extractMetadata(buffer);
    } catch (err) {
        console.warn('[upload] Metadata extraction failed (non-fatal):', err);
    }

    let detection: DetectionResult | null = null;
    try {
        detection = await detectAnimal(buffer, mime_type);
    } catch (err) {
        console.error('[upload] ML detection failed:', err);
        throw new Error(`ML service error: ${err}`);
    }

    if (!detection || !detection.label) {
        throw new Error(
            'ML service returned invalid detection. Is the ML service running and healthy?'
        );
    }

    let thumbnailPath: string | null = null;
    try {
        const thumbnailBuffer = await sharp(buffer)
            .resize(300)
            .jpeg({ quality: 80 })
            .toBuffer();
        thumbnailPath = `thumbnails/${file_path.replace(/\.[^/.]+$/, '')}.jpg`;
        await minioClient.putObject(
            bucketName,
            thumbnailPath,
            thumbnailBuffer,
            thumbnailBuffer.length,
            { 'Content-Type': 'image/jpeg' }
        );
    } catch (err) {
        console.warn('[upload] Thumbnail generation failed (non-fatal):', err);
    }

    const detectionConfidence = Math.round(detection.score * 100);
    const tempMetadata = {
        taken_at: metadata.date_time_original || null,
        camera_species_hint: null,
        ai_prediction: {
            label: detection.label,
            scientific_name: detection.scientific_name,
            confidence: detectionConfidence,
            model_version: 'blip-v1',
        },
    };

    // Auto-approve if confidence >= 90%
    const isHighConfidence = detectionConfidence >= 90;
    const confirmationStatus = isHighConfidence ? 'confirmed' : 'pending_confirmation';
    const confirmedAt = isHighConfidence ? new Date().toISOString() : null;
    const confirmedBy = null; // System approvals have null confirmed_by; use auto_approved flag instead
    const approvalMethod = isHighConfidence ? 'auto_approved' : null;

    const [image] = await sql`
        INSERT INTO images (
            camera_id, file_path, original_filename, file_size, mime_type,
            taken_at, uploaded_by, metadata, status, thumbnail_path,
            detected_animal, detected_animal_scientific, detection_confidence,
            confirmation_status, confirmed_at, confirmed_by, approval_method, auto_approved
        ) VALUES (
            ${actualCameraId}, ${file_path}, ${original_filename}, ${file_size}, ${mime_type},
            ${metadata.date_time_original || null}, ${user.userId},
            ${sql.json(tempMetadata)}, 'processing', ${thumbnailPath},
            ${detection.label}, ${detection.scientific_name}, ${detectionConfidence},
            ${confirmationStatus}, ${confirmedAt}, ${confirmedBy}, ${approvalMethod}, ${isHighConfidence}
        )
        RETURNING id, file_path, detected_animal, detection_confidence, thumbnail_path, confirmation_status, confirmed_at
    `;

    return c.json(
        {
            detection: {
                id: image.id,
                file_path: image.file_path,
                thumbnail_path: image.thumbnail_path,
                detected_animal: image.detected_animal,
                detected_animal_scientific: detection.scientific_name,
                confidence: image.detection_confidence,
                camera_id: actualCameraId,
                status: image.confirmation_status,
                autoApproved: isHighConfidence,
            },
            message: isHighConfidence 
                ? `✅ High confidence detection auto-approved (${detectionConfidence}%)`
                : 'Detection ready for manual confirmation',
        },
        201
    );
}

/**
 * POST /upload/direct — Browser → API (multipart) → MinIO → ML → DB.
 * Avoids presigned URLs, CORS to MinIO, and signature mismatches.
 */
upload.post('/direct', requireAuth, requireRoleLevel(1), async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.parseBody();
        const raw = body['file'];
        const camera_id = body['camera_id'];

        let buffer: Buffer;
        let original_filename: string;
        let mime_type: string;
        let file_size: number;

        if (raw instanceof File) {
            file_size = raw.size;
            if (file_size > MAX_UPLOAD_BYTES) {
                return c.json({ error: 'File exceeds 50MB limit' }, 400);
            }
            buffer = Buffer.from(await raw.arrayBuffer());
            mime_type = raw.type || 'application/octet-stream';
            original_filename = raw.name || 'upload';
        } else if (typeof Blob !== 'undefined' && raw instanceof Blob) {
            file_size = raw.size;
            if (file_size > MAX_UPLOAD_BYTES) {
                return c.json({ error: 'File exceeds 50MB limit' }, 400);
            }
            buffer = Buffer.from(await raw.arrayBuffer());
            mime_type = raw.type || 'application/octet-stream';
            original_filename = 'upload';
        } else {
            return c.json({ error: 'Missing file field (multipart form)' }, 400);
        }

        if (typeof camera_id !== 'string' || !camera_id.trim()) {
            return c.json({ error: 'Missing camera_id' }, 400);
        }

        const camera = await getCameraWithHierarchy(camera_id.trim());
        if (!camera) {
            return c.json({ error: 'Camera not found' }, 404);
        }

        const file_path = buildObjectName(camera, original_filename);
        const bucketName = process.env.MINIO_BUCKET_NAME || 'wildvision-images';

        await minioClient.putObject(
            bucketName,
            file_path,
            buffer,
            buffer.length,
            { 'Content-Type': mime_type }
        );
        console.log('[upload/direct] Stored in MinIO:', file_path, buffer.length, 'bytes');

        return runMlAndPersist(c, {
            user,
            actualCameraId: camera.id,
            file_path,
            original_filename,
            file_size,
            mime_type,
            buffer,
        });
    } catch (error: any) {
        console.error('❌ /upload/direct error:', error);
        return c.json(
            { error: error.message || 'Upload and detection failed' },
            500
        );
    }
});

// POST /upload/request - Generate presigned URL (legacy)
upload.post('/request', requireAuth, requireRoleLevel(1), async (c) => {
    try {
        const { filename, file_type, file_size, camera_id } = await c.req.json();

        if (!filename || !file_type || !file_size || !camera_id) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        const camera = await getCameraWithHierarchy(camera_id);
        if (!camera) return c.json({ error: 'Camera not found' }, 404);

        const objectName = buildObjectName(camera, filename);
        const url = await getPresignedUrl(objectName);

        console.log(`✅ Upload URL generated: ${objectName}`);
        return c.json({ upload_url: url, file_path: objectName, uuid: randomUUID() });
    } catch (error) {
        console.error('❌ Upload request error:', error);
        return c.json({ error: 'Failed to generate upload URL' }, 500);
    }
});

// POST /upload/complete — After client PUT to MinIO (legacy)
upload.post('/complete', requireAuth, requireRoleLevel(1), async (c) => {
    try {
        const user = c.get('user');
        const { file_path, camera_id, original_filename, file_size, mime_type } =
            await c.req.json();

        if (!file_path || !camera_id || !original_filename) {
            return c.json({ error: 'Missing required fields' }, 400);
        }

        const camera = await getCameraWithHierarchy(camera_id);
        if (!camera) {
            return c.json({ error: 'Camera not found' }, 404);
        }
        const actualCameraId = camera.id;

        const bucketName = process.env.MINIO_BUCKET_NAME || 'wildvision-images';
        try {
            await minioClient.statObject(bucketName, file_path);
        } catch {
            return c.json({ error: 'File not found in storage' }, 404);
        }

        let buffer: Buffer;
        try {
            const dataStream = await minioClient.getObject(bucketName, file_path);
            const chunks: Buffer[] = [];
            for await (const chunk of dataStream) {
                chunks.push(chunk as Buffer);
            }
            buffer = Buffer.concat(chunks);
        } catch (err) {
            console.error('Failed to download from MinIO:', err);
            return c.json({ error: 'Failed to download file' }, 500);
        }

        return runMlAndPersist(c, {
            user,
            actualCameraId,
            file_path,
            original_filename,
            file_size: file_size ?? buffer.length,
            mime_type: mime_type || 'application/octet-stream',
            buffer,
        });
    } catch (error: any) {
        console.error('❌ Upload complete error:', error);
        return c.json({ error: error.message || 'Failed to process upload' }, 500);
    }
});

upload.post('/confirm', requireAuth, requireRoleLevel(1), async (c) => {
    try {
        const user = c.get('user');
        const { image_id, confirmed, detected_animal } = await c.req.json();

        if (!image_id) {
            return c.json({ error: 'Missing image_id' }, 400);
        }

        if (confirmed) {
            // If a new animal name is provided, update it; otherwise preserve the existing ML-detected name
            if (detected_animal?.trim()) {
                await sql`
                    UPDATE images
                    SET 
                        confirmation_status = 'confirmed',
                        confirmed_at = ${new Date()},
                        confirmed_by = ${user.userId},
                        status = 'processed',
                        detected_animal = ${detected_animal.trim()}
                    WHERE id = ${image_id}
                `;
            } else {
                await sql`
                    UPDATE images
                    SET 
                        confirmation_status = 'confirmed',
                        confirmed_at = ${new Date()},
                        confirmed_by = ${user.userId},
                        status = 'processed'
                    WHERE id = ${image_id}
                `;
            }
            console.log('[confirm] Detection confirmed:', image_id, 'Animal:', detected_animal);

            processImageMetadata(image_id, Buffer.from('')).catch((err) => {
                console.warn('[upload] Background processing failed:', err);
            });

            return c.json({
                message: 'Detection confirmed and saved',
                image_id: image_id,
                status: 'confirmed',
                detected_animal: detected_animal || 'confirmed with original',
            });
        } else {
            await sql`DELETE FROM images WHERE id = ${image_id}`;
            console.log('[confirm] Detection rejected:', image_id);

            return c.json({
                message: 'Detection rejected',
                image_id: image_id,
                status: 'rejected',
            });
        }
    } catch (error: any) {
        console.error('❌ Confirmation error:', error);
        return c.json({ error: error.message || 'Failed to confirm detection' }, 500);
    }
});

export default upload;
