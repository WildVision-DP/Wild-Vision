import sql from './src/db/connection';

async function checkImages() {
    try {
        const images = await sql`
            SELECT 
                i.id,
                i.file_path,
                i.thumbnail_path,
                i.camera_id,
                c.camera_name,
                i.taken_at,
                i.ai_labels,
                i.ai_confidence,
                i.review_status,
                i.uploaded_at
            FROM images i
            LEFT JOIN cameras c ON c.id = i.camera_id
            ORDER BY i.uploaded_at DESC
            LIMIT 20
        `;

        const [count] = await sql`SELECT count(*) FROM images`;

        console.log(`\n=== TOTAL IMAGES: ${count.count} ===\n`);
        
        if (images.length > 0) {
            console.log('Recent uploads:');
            images.forEach((img, idx) => {
                const aiLabels = img.ai_labels?.predictions?.[0];
                const species = aiLabels?.class || 'None';
                const confidence = img.ai_confidence ? (img.ai_confidence * 100).toFixed(1) : '0';
                
                console.log(`\n${idx + 1}. Camera: ${img.camera_name || 'Unknown'}`);
                console.log(`   Path: ${img.file_path}`);
                console.log(`   Thumbnail: ${img.thumbnail_path || 'None'}`);
                console.log(`   Taken: ${img.taken_at || 'Unknown'}`);
                console.log(`   AI: ${species} (${confidence}%)`);
                console.log(`   Status: ${img.review_status || 'pending'}`);
            });
        } else {
            console.log('No images found in database.');
        }

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await sql.end();
    }
}

checkImages();
