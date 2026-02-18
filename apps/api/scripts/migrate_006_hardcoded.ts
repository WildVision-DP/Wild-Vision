
import postgres from 'postgres';

const sql = postgres({
    host: 'localhost',
    port: 5432,
    database: 'wildvision',
    username: 'wildvision_user',
    password: 'wildvision_dev_password',
});

async function run() {
    try {
        console.log('Connecting to database...');
        // Test connection
        const [res] = await sql`SELECT 1 as connected`;
        console.log('Connected:', res.connected);

        console.log('Applying schema changes for thumbnails/AI...');

        await sql`
            ALTER TABLE images 
            ADD COLUMN IF NOT EXISTS thumbnail_path TEXT,
            ADD COLUMN IF NOT EXISTS ai_confidence FLOAT,
            ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'flagged')),
            ADD COLUMN IF NOT EXISTS ai_labels JSONB DEFAULT '{}'::jsonb
        `;

        console.log('Column changes applied.');

        await sql`CREATE INDEX IF NOT EXISTS idx_images_review_status ON images(review_status)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_images_ai_confidence ON images(ai_confidence)`;

        console.log('Indexes created.');
        console.log('✅ Migration 006 (Hardcoded) applied successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sql.end();
    }
}

run();
