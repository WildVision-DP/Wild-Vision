import sql from './src/db/connection';

async function checkDuplicates() {
    try {
        // Check for potential duplicates by original filename and camera
        const duplicates = await sql`
            SELECT 
                original_filename,
                camera_id,
                COUNT(*) as count,
                STRING_AGG(id::text, ', ') as image_ids,
                STRING_AGG(file_path, ' | ') as paths
            FROM images
            GROUP BY original_filename, camera_id
            HAVING COUNT(*) > 1
        `;

        console.log('\n=== DUPLICATE CHECK ===\n');
        
        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicate filename(s):\n`);
            duplicates.forEach((dup, idx) => {
                console.log(`${idx + 1}. Filename: ${dup.original_filename}`);
                console.log(`   Camera ID: ${dup.camera_id}`);
                console.log(`   Count: ${dup.count}`);
                console.log(`   Image IDs: ${dup.image_ids}`);
                console.log(`   Paths: ${dup.paths}\n`);
            });
        } else {
            console.log('✅ No duplicate filenames found.\n');
        }

        // Show all images with details
        const all = await sql`
            SELECT 
                id,
                original_filename,
                file_path,
                camera_id,
                uploaded_at
            FROM images
            ORDER BY uploaded_at DESC
        `;

        console.log(`\n=== ALL IMAGES (${all.length} total) ===\n`);
        all.forEach((img, idx) => {
            console.log(`${idx + 1}. ${img.original_filename}`);
            console.log(`   ID: ${img.id}`);
            console.log(`   Path: ${img.file_path}`);
            console.log(`   Uploaded: ${img.uploaded_at}\n`);
        });

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await sql.end();
    }
}

checkDuplicates();
