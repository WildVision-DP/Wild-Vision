import sql from './connection';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration009() {
    try {
        const migrationPath = join(__dirname, '../../../../infra/db/migrations/009_add_created_by_to_geography.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🔄 Running migration 009: Add created_by to geography tables');
        await sql.unsafe(migrationSQL);
        console.log('✅ Migration 009 completed successfully');
        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 009 failed:', error);
        await sql.end();
        process.exit(1);
    }
}

runMigration009();
