import sql from './apps/api/src/db/connection.js';

async function main() {
    const id = '93be23f5-c250-4031-8a75-eefd0690f074'; // camera with 0 images
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    // Check confirmed_by column type
    const colType = await sql`
        SELECT column_name, data_type FROM information_schema.columns 
        WHERE table_name = 'images' AND column_name = 'confirmed_by'
    `;
    console.log('confirmed_by type:', colType);
    
    // Test the approval breakdown query that likely throws
    try {
        const [approvalBreakdown] = await sql`
            SELECT 
                COUNT(*) as total_approved,
                COUNT(CASE WHEN approval_method = 'auto_approved' THEN 1 END) as auto_approved,
                COUNT(CASE WHEN confirmed_by != 'auto-ml-system' OR confirmed_by IS NULL THEN 1 END) as manual_approved
            FROM images
            WHERE camera_id = ${id}
            AND confirmation_status = 'confirmed'
            AND COALESCE(taken_at, uploaded_at) > ${cutoffDate}
        `;
        console.log('Breakdown:', approvalBreakdown);
    } catch(e) {
        console.error('Breakdown query error:', e.message);
    }
    
    process.exit(0);
}

main();
