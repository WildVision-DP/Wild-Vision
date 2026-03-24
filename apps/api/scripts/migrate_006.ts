
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres({
    host: 'localhost',
    port: 5432,
    database: 'wildvision',
    username: 'wildvision_user',
    password: 'wildvision_dev_password', // Hardcoded for dev script convenience, usually from env
});

async function run() {
    try {
        const migrationPath = path.resolve('../../infra/db/migrations/006_add_images_columns.sql');
        console.log(`Reading migration from: ${migrationPath}`);
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration...');
        await sql.unsafe(migrationSql);
        console.log('✅ Migration 006 applied successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await sql.end();
    }
}

run();
