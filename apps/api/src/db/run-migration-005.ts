import sql from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration005() {
    try {
        const migrationPath = join(__dirname, '../../../../infra/db/migrations/005_create_camera_locations.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🔄 Running migration: 005_create_camera_locations.sql');
        await sql.unsafe(migrationSQL);
        console.log('✅ Migration 005 completed successfully');

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 005 failed:', error);
        await sql.end();
        process.exit(1);
    }
}

runMigration005();
