import sql from './connection';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration010() {
    try {
        const migrationPath = join(__dirname, '../../../../infra/db/migrations/010_add_metadata_columns.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🔄 Running migration 010: Add EXIF metadata processing columns to images table');
        await sql.unsafe(migrationSQL);
        console.log('✅ Migration 010 completed successfully');
        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 010 failed:', error);
        await sql.end();
        process.exit(1);
    }
}

runMigration010();
