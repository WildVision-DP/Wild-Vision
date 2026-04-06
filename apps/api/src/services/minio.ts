import { Client } from 'minio';

const accessKey =
    process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin';
const secretKey =
    process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin123';
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'wildvision-images';
const MINIO_REGION = process.env.MINIO_REGION || 'us-east-1';

/**
 * Internal client: API container → MinIO on the Docker network (e.g. minio:9000).
 * Used for bucket init, statObject, getObject, putObject from the server.
 */
const minioInternal = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey,
    secretKey,
    region: MINIO_REGION,
});

/**
 * Presign client: hostname/port must match what the **browser** uses for PUT/GET.
 * SigV4 includes Host + path; rewriting URLs (e.g. to /minio/) breaks signatures → 403.
 * Region is fixed so presigning does not need to reach this endpoint from the container.
 */
const browserHost = process.env.MINIO_BROWSER_ENDPOINT || 'localhost';
const browserPort = parseInt(process.env.MINIO_BROWSER_PORT || '9000', 10);

const minioPresign = new Client({
    endPoint: browserHost,
    port: browserPort,
    useSSL: process.env.MINIO_BROWSER_USE_SSL === 'true',
    accessKey,
    secretKey,
    region: MINIO_REGION,
});

/**
 * Configure lifecycle rules for archiving old images (Task 3.1.2.3)
 */
async function configureLifecycleRules() {
    try {
        const lifecycleConfig = {
            Rule: [
                {
                    ID: 'archive-old-images',
                    Status: 'Enabled',
                    Filter: {
                        Prefix: '',
                    },
                    Transition: [
                        {
                            Days: 730,
                            StorageClass: 'GLACIER',
                        },
                    ],
                },
            ],
        };

        await minioInternal.setBucketLifecycle(BUCKET_NAME, lifecycleConfig as any);
        console.log(`📦 Lifecycle rules configured: Archive images after 2 years.`);
    } catch (error: any) {
        console.warn(
            '⚠️ Could not configure lifecycle rules (requires MinIO with ILM):',
            error.message
        );
        console.warn(
            '   → Manual archiving process may be needed for production deployment.'
        );
    }
}

/**
 * Initialize the MinIO bucket if it doesn't exist.
 *
 * NOTE: We do not apply a custom Deny bucket policy. A previous policy used
 * `s3:authType` = REST-HEADER, which blocks presigned URLs (query-string auth) and
 * caused HTTP 403 on browser uploads.
 */
export async function initMinio() {
    try {
        const exists = await minioInternal.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioInternal.makeBucket(BUCKET_NAME, MINIO_REGION);
            console.log(`🪣 Bucket '${BUCKET_NAME}' created successfully.`);
        } else {
            console.log(`ℹ️ Bucket '${BUCKET_NAME}' already exists.`);
        }

        // Remove any stored policy (older builds set a Deny rule that blocked presigned PUTs → 403).
        try {
            await minioInternal.setBucketPolicy(BUCKET_NAME, '');
            console.log(`🔓 Bucket policy cleared on '${BUCKET_NAME}' (presigned uploads allowed).`);
        } catch (e: any) {
            console.warn('⚠️ Could not clear bucket policy:', e?.message || e);
        }

        await configureLifecycleRules();
    } catch (error) {
        console.error('❌ Failed to initialize MinIO:', error);
    }
}

/**
 * Presigned PUT — browser uploads directly to MinIO (port 9000 by default).
 */
export async function getPresignedUrl(objectName: string, expiry = 900): Promise<string> {
    return minioPresign.presignedPutObject(BUCKET_NAME, objectName, expiry);
}

/**
 * Presigned GET — browser can load an object with the same host/port as uploads.
 */
export async function getDownloadUrl(objectName: string, expiry = 3600): Promise<string> {
    return minioPresign.presignedGetObject(BUCKET_NAME, objectName, expiry);
}

export default minioInternal;
