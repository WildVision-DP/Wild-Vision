/**
 * Image Metadata Extraction Service
 *
 * Task 3.1.3.1  — EXIF parsing library: exifr (installed in package.json)
 * Task 3.1.3.2  — Metadata extraction service (this file)
 * Task 3.1.3.3  — Extract EXIF timestamp (DateTimeOriginal)
 * Task 3.1.3.4  — Extract GPS coordinates from EXIF
 * Task 3.1.3.5  — Extract camera serial number from EXIF
 * Task 3.1.3.6  — Parse image dimensions (width, height)
 * Task 3.1.3.7  — Bind image to camera_id based on EXIF serial or filename
 * Task 3.1.3.8  — Geo-consistency check (EXIF GPS vs registered camera location)
 * Task 3.1.3.9  — Store metadata in images.metadata JSONB column (via processImageMetadata)
 * Task 3.1.3.10 — Handle missing EXIF data gracefully throughout
 */

import exifr from 'exifr';
import sql from '../db/connection';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Normalised view of everything we extract from an image's EXIF block.
 */
export interface ImageMetadata {
    // Task 3.1.3.3: Capture timestamps
    date_time_original?: Date | string | null;
    date_time_digitized?: Date | string | null;

    // Task 3.1.3.4: GPS coordinates
    gps_latitude?: number | null;
    gps_longitude?: number | null;
    gps_altitude?: number | null;
    gps_datum?: string | null;

    // Task 3.1.3.5: Camera identity
    make?: string | null;
    model?: string | null;
    serial_number?: string | null;

    // Task 3.1.3.6: Image dimensions
    width?: number | null;
    height?: number | null;
    orientation?: number | null;

    // Exposure metadata (useful for night/IR analysis)
    exposure_time?: number | null;
    f_number?: number | null;
    iso?: number | null;
    flash?: string | number | null;
    software?: string | null;

    // Complete raw EXIF dump preserved for future field-level queries (Task 3.1.3.9)
    raw?: Record<string, unknown>;
}

/** Result returned by checkGeoConsistency (Task 3.1.3.8) */
export interface GeoCheckResult {
    consistent: boolean;
    distance_m: number | null;
    exif_lat: number | null;
    exif_lon: number | null;
    camera_lat: number | null;
    camera_lon: number | null;
    note: string;
}

/** Result returned by bindCameraByExif (Task 3.1.3.7) */
export interface CameraBindResult {
    camera_id: string | null;
    method: 'exif_serial' | 'filepath' | 'none';
}

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum acceptable distance (metres) between EXIF GPS and registered camera location.
 * Cameras can be moved ± a few hundred metres due to tree cover; 5 km flags genuine mismatches.
 */
const GEO_CONSISTENCY_THRESHOLD_M = 5_000; // 5 km

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Haversine great-circle distance between two WGS-84 coordinates (metres).
 */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Task 3.1.3.2 / 3.1.3.3 / 3.1.3.4 / 3.1.3.5 / 3.1.3.6 / 3.1.3.10
 *
 * Extract normalised metadata from an image Buffer or file path.
 * Never throws — returns an empty object when EXIF is absent or unparseable.
 */
export async function extractMetadata(input: Buffer | string): Promise<ImageMetadata> {
    try {
        const raw = await exifr.parse(input, {
            tiff: true,
            exif: true,
            gps: true,
            ifd1: false,
            interop: false,
            sanitize: false,
            translateValues: true,
        });

        // Task 3.1.3.10: No EXIF block present — normal for camera-trap JPEGs stripped of metadata
        if (!raw) {
            console.info('[metadata] No EXIF block found in image — returning empty metadata.');
            return {};
        }

        return {
            // Task 3.1.3.3
            date_time_original:  raw.DateTimeOriginal  ?? raw.DateTime         ?? null,
            date_time_digitized: raw.DateTimeDigitized ??                          null,

            // Task 3.1.3.4
            gps_latitude:  raw.latitude   ?? (raw.GPSLatitude  as number) ?? null,
            gps_longitude: raw.longitude  ?? (raw.GPSLongitude as number) ?? null,
            gps_altitude:  (raw.GPSAltitude  as number) ?? null,
            gps_datum:     (raw.GPSMapDatum  as string) ?? null,

            // Task 3.1.3.5: Multiple possible EXIF tags for serial number
            serial_number:
                (raw.BodySerialNumber   as string) ??
                (raw.SerialNumber       as string) ??
                (raw.CameraSerialNumber as string) ??
                null,
            make:  (raw.Make  as string) ?? null,
            model: (raw.Model as string) ?? null,

            // Task 3.1.3.6
            width:
                (raw.ExifImageWidth   as number) ??
                (raw.ImageWidth       as number) ??
                (raw.PixelXDimension  as number) ??
                null,
            height:
                (raw.ExifImageHeight  as number) ??
                (raw.ImageHeight      as number) ??
                (raw.PixelYDimension  as number) ??
                null,
            orientation: (raw.Orientation as number) ?? null,

            // Exposure
            exposure_time: (raw.ExposureTime as number)              ?? null,
            f_number:      (raw.FNumber      as number)              ?? null,
            iso:           (raw.ISO          as number)              ??
                           (raw.ISOSpeedRatings as number)           ?? null,
            flash:         (raw.Flash        as string | number)     ?? null,
            software:      (raw.Software     as string)              ?? null,

            // Full dump for jsonb storage (Task 3.1.3.9)
            raw,
        };
    } catch (err) {
        // Task 3.1.3.10: Corrupt, unsupported, or plain JPEG — non-fatal
        console.warn('[metadata] extractMetadata warning (non-fatal):', err instanceof Error ? err.message : err);
        return {};
    }
}

/**
 * Task 3.1.3.7
 *
 * Attempt to bind an image to a camera record using two strategies (in order):
 *   1. EXIF serial number matched against cameras.serial_number
 *   2. Government camera_id embedded in the MinIO object path
 *      (path: circle/division/range/beat/CAMERA_GOV_ID/yyyy-mm-dd/uuid.ext)
 *
 * Never throws (Task 3.1.3.10).
 */
export async function bindCameraByExif(
    exifSerial: string | null | undefined,
    filePath: string,
): Promise<CameraBindResult> {
    // Strategy 1 — EXIF serial number
    if (exifSerial) {
        try {
            const [cam] = await sql`
                SELECT id
                FROM cameras
                WHERE serial_number = ${exifSerial}
                  AND deleted_at IS NULL
                LIMIT 1
            `;
            if (cam) {
                console.info(`[metadata] Camera bound via EXIF serial "${exifSerial}" → ${cam.id}`);
                return { camera_id: cam.id as string, method: 'exif_serial' };
            }
        } catch (err) {
            console.warn('[metadata] Bind by EXIF serial failed (non-fatal):', err instanceof Error ? err.message : err);
        }
    }

    // Strategy 2 — Government camera_id from MinIO object path
    try {
        const parts = filePath.replace(/^\//, '').split('/');
        // Expected: [circle, division, range, beat, CAMERA_GOV_ID, yyyy-mm-dd, uuid.ext]
        if (parts.length >= 6) {
            const govId = parts[4];
            const [cam] = await sql`
                SELECT id
                FROM cameras
                WHERE (
                    REGEXP_REPLACE(camera_id, '[^a-zA-Z0-9]', '_', 'g') = ${govId}
                    OR camera_id = ${govId}
                )
                  AND deleted_at IS NULL
                LIMIT 1
            `;
            if (cam) {
                console.info(`[metadata] Camera bound via filepath segment "${govId}" → ${cam.id}`);
                return { camera_id: cam.id as string, method: 'filepath' };
            }
        }
    } catch (err) {
        console.warn('[metadata] Bind by filepath failed (non-fatal):', err instanceof Error ? err.message : err);
    }

    console.info(`[metadata] Camera binding unresolved for path: ${filePath}`);
    return { camera_id: null, method: 'none' };
}

/**
 * Task 3.1.3.8
 *
 * Compare EXIF GPS against the camera's registered latitude/longitude (cameras table).
 * Returns a GeoCheckResult — never throws (Task 3.1.3.10).
 *
 * Treats missing EXIF GPS or unregistered camera GPS as "consistent" (no data to refute).
 */
export async function checkGeoConsistency(
    imageId: string,
    exifLat: number | null | undefined,
    exifLon: number | null | undefined,
): Promise<GeoCheckResult> {
    const skipped = (note: string): GeoCheckResult => ({
        consistent: true,
        distance_m: null,
        exif_lat: exifLat ?? null,
        exif_lon: exifLon ?? null,
        camera_lat: null,
        camera_lon: null,
        note,
    });

    if (exifLat == null || exifLon == null) {
        return skipped('No GPS in EXIF — geo-consistency check skipped');
    }

    try {
        // cameras table stores latitude/longitude as plain DECIMAL columns (migration 004)
        const [row] = await sql`
            SELECT c.latitude, c.longitude
            FROM images i
            JOIN cameras c ON c.id = i.camera_id
            WHERE i.id    = ${imageId}
              AND c.latitude  IS NOT NULL
              AND c.longitude IS NOT NULL
        `;

        if (!row) {
            return skipped('Camera has no registered GPS — geo-consistency check skipped');
        }

        const cameraLat  = parseFloat(row.latitude as string);
        const cameraLon  = parseFloat(row.longitude as string);
        const distanceM  = Math.round(haversineM(exifLat, exifLon, cameraLat, cameraLon));
        const consistent = distanceM <= GEO_CONSISTENCY_THRESHOLD_M;

        if (!consistent) {
            console.warn(
                `[metadata] ⚠️  Geo-inconsistency for image ${imageId}: ` +
                `EXIF (${exifLat}, ${exifLon}) is ${distanceM}m from ` +
                `camera (${cameraLat}, ${cameraLon}) — exceeds ${GEO_CONSISTENCY_THRESHOLD_M}m threshold`,
            );
        }

        return {
            consistent,
            distance_m: distanceM,
            exif_lat: exifLat,
            exif_lon: exifLon,
            camera_lat: cameraLat,
            camera_lon: cameraLon,
            note: consistent
                ? `Within threshold (${distanceM}m ≤ ${GEO_CONSISTENCY_THRESHOLD_M}m)`
                : `Exceeds threshold (${distanceM}m > ${GEO_CONSISTENCY_THRESHOLD_M}m)`,
        };
    } catch (err) {
        console.warn('[metadata] checkGeoConsistency error (non-fatal):', err instanceof Error ? err.message : err);
        return skipped('Geo-consistency check encountered a database error — skipped');
    }
}

/**
 * Task 3.1.3.2 — Full metadata orchestration
 * Task 3.1.3.9 — Persists complete JSONB payload to images.metadata
 *
 * Receives the already-fetched image Buffer. Executes all sub-tasks in sequence:
 *   1. EXIF extraction          (3.1.3.3 – 3.1.3.6)
 *   2. Camera binding           (3.1.3.7 — only when camera_id is not yet assigned)
 *   3. Geo-consistency check    (3.1.3.8)
 *   4. Persist full metadata    (3.1.3.9)
 *
 * Never throws — marks metadata_status = 'failed' on error (Task 3.1.3.10).
 */
export async function processImageMetadata(
    imageId: string,
    buffer: Buffer,
): Promise<void> {
    try {
        // Claim the record to prevent concurrent processing
        await sql`
            UPDATE images
            SET metadata_status = 'processing'
            WHERE id = ${imageId}
        `;

        // Step 1: EXIF extraction (Tasks 3.1.3.3 – 3.1.3.6)
        const exif = await extractMetadata(buffer);

        // Step 2: Camera binding — only if camera_id is unset (Task 3.1.3.7)
        const [existing] = await sql`
            SELECT camera_id, file_path FROM images WHERE id = ${imageId}
        `;
        let bindingMethod: CameraBindResult['method'] = 'none';

        if (!existing?.camera_id) {
            const { camera_id: boundId, method } = await bindCameraByExif(
                exif.serial_number,
                existing?.file_path ?? '',
            );
            bindingMethod = method;
            if (boundId) {
                await sql`UPDATE images SET camera_id = ${boundId} WHERE id = ${imageId}`;
            }
        }

        // Step 3: Geo-consistency check (Task 3.1.3.8)
        const geoResult = await checkGeoConsistency(imageId, exif.gps_latitude, exif.gps_longitude);

        // Step 4: Build JSONB payload — separate summary from raw dump (Task 3.1.3.9)
        const { raw: rawExif, ...exifSummary } = exif;
        const fullMetadata: Record<string, unknown> = {
            ...exifSummary,
            raw_exif: rawExif ?? null,
            geo_check: geoResult,
            camera_binding_method: bindingMethod,
            processed_at: new Date().toISOString(),
        };

        // Step 5: Persist (Task 3.1.3.9) — merge with existing metadata non-destructively
        await sql`
            UPDATE images
            SET
                metadata_status       = 'completed',
                metadata_processed_at = CURRENT_TIMESTAMP,
                geo_consistent        = ${geoResult.consistent},
                geo_distance_m        = ${geoResult.distance_m},
                exif_camera_serial    = ${exif.serial_number ?? null},
                taken_at              = COALESCE(
                                            taken_at,
                                            ${
                                                exif.date_time_original
                                                    ? new Date(exif.date_time_original as string)
                                                    : null
                                            }
                                        ),
                metadata              = metadata || ${sql.json(fullMetadata)}
            WHERE id = ${imageId}
        `;

        console.info(
            `[metadata] ✅ Processing complete for image ${imageId} ` +
            `(binding: ${bindingMethod}, geo: ${geoResult.note})`,
        );
    } catch (err) {
        console.error(`[metadata] ❌ Processing failed for image ${imageId}:`, err);

        // Task 3.1.3.10: Record failure in DB; do not rethrow
        await sql`
            UPDATE images
            SET
                metadata_status = 'failed',
                metadata        = metadata || ${sql.json({
                    processing_error: err instanceof Error ? err.message : String(err),
                    failed_at: new Date().toISOString(),
                } as Record<string, unknown>)}
            WHERE id = ${imageId}
        `.catch(() => { /* Silently absorb — preserve calling context */ });
    }
}
