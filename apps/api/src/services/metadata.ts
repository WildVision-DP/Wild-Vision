import exifr from 'exifr';

export interface ImageMetadata {
    date_time_original?: Date;
    gps_latitude?: number | null;
    gps_longitude?: number | null;
    width?: number;
    height?: number;
    make?: string;
    model?: string;
    serial_number?: string;
}

/**
 * Extract metadata from an image buffer or file path
 * Uses 'exifr' for parsing
 */
export async function extractMetadata(input: Buffer | string): Promise<ImageMetadata> {
    try {
        const metadata = await exifr.parse(input, {
            tiff: true,
            exif: true,
            gps: true,
            file: true // Dimensions
        });

        if (!metadata) return {};

        return {
            date_time_original: metadata.DateTimeOriginal,
            gps_latitude: metadata.latitude,
            gps_longitude: metadata.longitude,
            width: metadata.ExifImageWidth,
            height: metadata.ExifImageHeight,
            make: metadata.Make,
            model: metadata.Model,
            serial_number: metadata.BodySerialNumber || metadata.SerialNumber
        };
    } catch (error) {
        console.warn('Metadata extraction warning:', error);
        return {};
    }
}
