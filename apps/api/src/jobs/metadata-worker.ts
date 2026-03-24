/**
 * Metadata Background Worker
 *
 * Task 3.1.3.11 — Background job for asynchronous EXIF metadata extraction.
 *
 * Responsibilities:
 *   - Poll the images table every POLL_INTERVAL_MS for records with
 *     metadata_status = 'pending'.
 *   - Process up to BATCH_SIZE images per tick to avoid memory spikes.
 *   - Download each image from MinIO, then call processImageMetadata() which
 *     handles EXIF extraction, camera binding, geo-consistency, and DB update.
 *   - Recover stalled 'processing' records left by a crashed process (after
 *     STALL_TIMEOUT_MINUTES).
 *
 * The worker is complementary to the synchronous path in upload.ts:
 *   - Happy path: upload.ts calls processImageMetadata immediately after upload.
 *   - Retry / backfill: this worker picks up any 'pending' records that were not
 *     processed (e.g. server restart, MinIO timeout, old images pre-dating the
 *     metadata pipeline).
 */

import sql from '../db/connection';
import minioClient from '../services/minio';
import { processImageMetadata } from '../services/metadata';

// ─── Configuration ────────────────────────────────────────────────────────────

/** How often the worker polls for pending images (ms). */
const POLL_INTERVAL_MS = 30_000; // 30 seconds

/** Maximum images processed per poll tick. */
const BATCH_SIZE = 5;

/**
 * Records stuck in 'processing' for longer than this are considered stalled
 * (e.g. the previous process crashed mid-flight) and reset to 'pending'.
 */
const STALL_TIMEOUT_MINUTES = 10;

const BUCKET = process.env.MINIO_BUCKET_NAME ?? 'wildvision-images';

// ─── State ────────────────────────────────────────────────────────────────────

let workerTimer: ReturnType<typeof setInterval> | null = null;
let isTicking = false; // Guard against overlapping ticks

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Reset stalled 'processing' records back to 'pending' so they are retried.
 * A record is considered stalled if it has been in 'processing' for longer than
 * STALL_TIMEOUT_MINUTES without metadata_processed_at being set.
 */
async function resetStalledRecords(): Promise<void> {
    try {
        const result = await sql`
            UPDATE images
            SET metadata_status = 'pending'
            WHERE metadata_status = 'processing'
              AND metadata_processed_at IS NULL
              AND uploaded_at < NOW() - INTERVAL '${sql.unsafe(String(STALL_TIMEOUT_MINUTES))} minutes'
        `;
        if (result.count > 0) {
            console.warn(`[metadata-worker] ♻️  Reset ${result.count} stalled processing record(s) to 'pending'.`);
        }
    } catch (err) {
        console.warn('[metadata-worker] resetStalledRecords error (non-fatal):', err instanceof Error ? err.message : err);
    }
}

/**
 * Claim and process one batch of 'pending' images.
 * Uses SELECT … FOR UPDATE SKIP LOCKED for safe concurrent workers (future-proof).
 */
async function processBatch(): Promise<void> {
    if (isTicking) return;
    isTicking = true;

    try {
        // Step 1: Recover stalled records
        await resetStalledRecords();

        // Step 2: Atomically claim a batch (prevents double-processing)
        const pending = await sql<{ id: string; file_path: string }[]>`
            UPDATE images
            SET metadata_status = 'processing'
            WHERE id IN (
                SELECT id FROM images
                WHERE metadata_status = 'pending'
                ORDER BY uploaded_at ASC
                LIMIT ${BATCH_SIZE}
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, file_path
        `;

        if (pending.length === 0) {
            // Nothing to do this tick — silent
            return;
        }

        console.info(`[metadata-worker] 🔄 Processing ${pending.length} pending image(s)…`);

        // Step 3: Process all claimed records in parallel
        await Promise.allSettled(
            pending.map(async ({ id, file_path }) => {
                try {
                    // Download from MinIO
                    const stream = await minioClient.getObject(BUCKET, file_path);
                    const chunks: Buffer[] = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk as Buffer);
                    }
                    const buffer = Buffer.concat(chunks);

                    // Full metadata pipeline (extract → bind → geo-check → persist)
                    await processImageMetadata(id, buffer);
                } catch (err) {
                    console.error(`[metadata-worker] Failed to process image ${id}:`, err instanceof Error ? err.message : err);

                    // Mark as failed so it is not retried endlessly in this session.
                    // The admin can reset it to 'pending' manually if required.
                    await sql`
                        UPDATE images
                        SET metadata_status = 'failed'
                        WHERE id = ${id}
                          AND metadata_status = 'processing'
                    `.catch(() => { /* Absorb */ });
                }
            }),
        );

    } catch (err) {
        console.error('[metadata-worker] Batch error:', err instanceof Error ? err.message : err);
    } finally {
        isTicking = false;
    }
}

// ─── Public Interface ─────────────────────────────────────────────────────────

/**
 * Start the metadata background worker.
 * Idempotent — safe to call multiple times; only one timer is ever active.
 */
export function startMetadataWorker(): void {
    if (workerTimer !== null) return;

    console.info(
        `[metadata-worker] 🚀 Started — polling every ${POLL_INTERVAL_MS / 1000}s, ` +
        `batch size: ${BATCH_SIZE}, stall timeout: ${STALL_TIMEOUT_MINUTES}min`,
    );

    // Run one tick immediately on startup to drain any backlog from previous session
    processBatch().catch(console.error);

    workerTimer = setInterval(() => {
        processBatch().catch(console.error);
    }, POLL_INTERVAL_MS);
}

/**
 * Stop the metadata background worker gracefully.
 * Called during server shutdown to prevent resource leaks.
 */
export function stopMetadataWorker(): void {
    if (workerTimer !== null) {
        clearInterval(workerTimer);
        workerTimer = null;
        console.info('[metadata-worker] 🛑 Stopped.');
    }
}
