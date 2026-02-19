import sql from './src/db/connection';
import minioClient from './src/services/minio';

async function cleanup() {
    try {
        console.log('\n🧹 Cleaning up test images...\n');

        // Get all images from database
        const images = await sql`SELECT id, file_path, thumbnail_path FROM images`;
        
        console.log(`Found ${images.length} images in database`);

        // Delete from MinIO
        let deletedFromMinio = 0;
        for (const img of images) {
            try {
                // Delete main image
                if (img.file_path) {
                    await minioClient.removeObject('wildvision-images', img.file_path);
                    console.log(`✓ Deleted: ${img.file_path}`);
                    deletedFromMinio++;
                }
                
                // Delete thumbnail
                if (img.thumbnail_path) {
                    await minioClient.removeObject('wildvision-images', img.thumbnail_path);
                    console.log(`✓ Deleted: ${img.thumbnail_path}`);
                    deletedFromMinio++;
                }
            } catch (err: any) {
                if (err.code === 'NoSuchKey') {
                    console.log(`⚠ File not found in MinIO: ${img.file_path}`);
                } else {
                    console.error(`✗ Error deleting from MinIO:`, err.message);
                }
            }
        }

        // Delete from database
        const result = await sql`DELETE FROM images`;
        console.log(`\n✅ Deleted ${result.count} records from database`);
        console.log(`✅ Deleted ${deletedFromMinio} files from MinIO`);
        console.log('\n🎉 Cleanup complete!\n');

    } catch (err) {
        console.error('❌ Cleanup failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

cleanup();
