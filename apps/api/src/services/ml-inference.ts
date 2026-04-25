/**
 * ML Inference Service
 * Calls the Python ML microservice to identify animals in images with confidence scoring
 */

function normalizeLocalhostUrl(url: string): string {
    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'localhost') {
            parsed.hostname = '127.0.0.1';
            return parsed.toString().replace(/\/$/, '');
        }
    } catch {
        return url;
    }

    return url.replace(/\/$/, '');
}

const ML_SERVICE_URL = normalizeLocalhostUrl(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000');
console.log(`ML Service URL: ${ML_SERVICE_URL}`);

interface MlPrediction {
    label: string;
    scientific_name: string;
    score: number;
    results: Array<{
        label: string;
        score: number;
    }>;
    caption?: string;
    confidence?: number;
    autoApproved?: boolean;
    method?: string;
    metadata?: Record<string, any>;
}

export async function predictAnimal(imageBuffer: Buffer, fileName: string): Promise<MlPrediction> {
    try {
        // Check if ML service is available
        try {
            const healthRes = await fetch(`${ML_SERVICE_URL}/health`);
            if (!healthRes.ok) {
                throw new Error('ML service unavailable');
            }
        } catch (err) {
            console.warn('⚠️ ML service not available at', ML_SERVICE_URL);
            return {
                label: 'Unknown',
                scientific_name: 'unknown',
                score: 0,
                results: [],
                caption: 'Service unavailable',
                confidence: 0,
                autoApproved: false,
                method: 'offline',
                metadata: {
                    error: 'ML service unreachable',
                    timestamp: new Date().toISOString()
                }
            };
        }

        // Create FormData with image
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, fileName);

        // Call ML service
        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('ML prediction error:', error);
            throw new Error(`ML service returned ${response.status}`);
        }

        const prediction = await response.json() as {
            caption?: string;
            animal?: string;
            confidence?: number;
            label?: string;
            scientific_name?: string;
            score?: number;
            autoApproved?: boolean;
            method?: string;
            metadata?: Record<string, any>;
        };

        const label = prediction.animal || prediction.label || 'Unknown';
        const confidence = prediction.confidence ?? prediction.score ?? 0;

        console.log(`✅ Animal detected: ${label} (${(confidence * 100).toFixed(2)}%) ${prediction.autoApproved ? '[AUTO-APPROVED]' : '[PENDING REVIEW]'}`);

        return {
            label,
            scientific_name: prediction.scientific_name || 'unknown',
            score: confidence,
            results: [],
            caption: prediction.caption,
            confidence,
            autoApproved: prediction.autoApproved,
            method: prediction.method,
            metadata: prediction.metadata
        };

    } catch (error) {
        console.error('❌ Animal prediction failed:', error);
        // Return offline response
        return {
            label: 'Unknown',
            scientific_name: 'unknown',
            score: 0,
            results: [],
            caption: 'Detection failed',
            confidence: 0,
            autoApproved: false,
            method: 'error',
            metadata: {
                error: String(error),
                timestamp: new Date().toISOString()
            }
        };
    }
}

export async function extractImageBuffer(url: string): Promise<Buffer> {
    /**
     * Extract image buffer from MinIO URL or file system
     */
    try {
        if (url.startsWith('http')) {
            const response = await fetch(url);
            return Buffer.from(await response.arrayBuffer());
        }
        // For local paths, would need to implement file reading
        throw new Error('Local file extraction not implemented');
    } catch (error) {
        console.error('Failed to extract image:', error);
        throw error;
    }
}
