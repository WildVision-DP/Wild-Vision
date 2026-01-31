import sql from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration002() {
    try {
        const migrationPath = join(__dirname, '../../../../infra/db/migrations/002_create_forest_hierarchy.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🔄 Running migration: 002_create_forest_hierarchy.sql');
        await sql.unsafe(migrationSQL);
        console.log('✅ Migration 002 completed successfully');

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 002 failed:', error);
        await sql.end();
        process.exit(1);
    }
}

runMigration002();
