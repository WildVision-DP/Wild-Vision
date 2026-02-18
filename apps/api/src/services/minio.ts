import { Client } from 'minio';

// Initialize MinIO client
// Use environment variables or defaults matching docker-compose
const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'wildvision-images';

/**
 * Initialize the MinIO bucket if it doesn't exist
 */
export async function initMinio() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1'); // Region is required but ignored by MinIO
            console.log(`🪣 Bucket '${BUCKET_NAME}' created successfully.`);

            // Set bucket policy to read-only for public (optional, usually we want signed URLs)
            // For now, keep it private.
        } else {
            console.log(`ℹ️ Bucket '${BUCKET_NAME}' already exists.`);
        }
    } catch (error) {
        console.error('❌ Failed to initialize MinIO:', error);
    }
}

/**
 * Generate a presigned URL for PUT requests (Upload)
 * @param objectName - The key/path for the file
 * @param expiry - Expiry in seconds (default 15 mins)
 */
export async function getPresignedUrl(objectName: string, expiry = 900): Promise<string> {
    return await minioClient.presignedPutObject(BUCKET_NAME, objectName, expiry);
}

/**
 * Generate a presigned URL for GET requests (View)
 * @param objectName - The key/path for the file
 * @param expiry - Expiry in seconds (default 1 hour)
 */
export async function getDownloadUrl(objectName: string, expiry = 3600): Promise<string> {
    return await minioClient.presignedGetObject(BUCKET_NAME, objectName, expiry);
}

export default minioClient;
