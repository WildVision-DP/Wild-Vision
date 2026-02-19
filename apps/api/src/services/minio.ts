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
 * Storage Layout Structure (Task 3.1.2.1):
 * /circle/division/range/beat/camera-id/yyyy-mm-dd/uuid.ext
 * 
 * Example: Karnataka_Circle/Bandipur_Division/North_Range/Beat_01/BRW-001/2026-02-18/abc123.jpg
 * 
 * Thumbnails stored in parallel structure:
 * thumbnails/circle/division/range/beat/camera-id/yyyy-mm-dd/uuid.jpg
 */

/**
 * Configure bucket policy to be private by default (Task 3.1.2.2)
 * All access requires presigned URLs for security
 */
async function configureBucketPolicy() {
    try {
        // Policy: Deny all public access, require authentication
        // MinIO uses AWS S3-compatible bucket policies
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Deny',
                    Principal: '*',
                    Action: ['s3:GetObject', 's3:ListBucket'],
                    Resource: [
                        `arn:aws:s3:::${BUCKET_NAME}/*`,
                        `arn:aws:s3:::${BUCKET_NAME}`
                    ],
                    Condition: {
                        StringNotEquals: {
                            's3:authType': 'REST-HEADER' // Only allow authenticated requests
                        }
                    }
                }
            ]
        };

        await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
        console.log(`🔒 Bucket '${BUCKET_NAME}' policy set to private (authenticated access only).`);
    } catch (error: any) {
        // If policy setting fails, log but don't crash - bucket is private by default
        console.warn('⚠️ Could not set explicit bucket policy (bucket remains private by default):', error.message);
    }
}

/**
 * Configure lifecycle rules for archiving old images (Task 3.1.2.3)
 * Archives images older than 2 years to reduce storage costs
 */
async function configureLifecycleRules() {
    try {
        // Lifecycle rule: Transition to archive storage after 2 years (730 days)
        const lifecycleConfig = {
            Rule: [
                {
                    ID: 'archive-old-images',
                    Status: 'Enabled',
                    Filter: {
                        Prefix: '' // Apply to all objects
                    },
                    Transition: [
                        {
                            Days: 730, // 2 years
                            StorageClass: 'GLACIER' // MinIO supports tiering to cold storage
                        }
                    ]
                }
            ]
        };

        // Note: MinIO lifecycle requires MinIO version with ILM support
        // In development, this may not be available - gracefully handle
        await minioClient.setBucketLifecycle(BUCKET_NAME, lifecycleConfig as any);
        console.log(`📦 Lifecycle rules configured: Archive images after 2 years.`);
    } catch (error: any) {
        // Lifecycle may not be supported in all MinIO setups
        console.warn('⚠️ Could not configure lifecycle rules (requires MinIO with ILM):', error.message);
        console.warn('   → Manual archiving process may be needed for production deployment.');
    }
}

/**
 * Initialize the MinIO bucket if it doesn't exist
 * Configures bucket policies and lifecycle rules
 */
export async function initMinio() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1'); // Region is required but ignored by MinIO
            console.log(`🪣 Bucket '${BUCKET_NAME}' created successfully.`);
        } else {
            console.log(`ℹ️ Bucket '${BUCKET_NAME}' already exists.`);
        }

        // Configure bucket policies and lifecycle rules (Task 3.1.2.2, 3.1.2.3)
        await configureBucketPolicy();
        await configureLifecycleRules();

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
