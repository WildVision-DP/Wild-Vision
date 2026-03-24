import sql from './connection';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration008() {
    try {
        const migrationPath = join(__dirname, '../../../../infra/db/migrations/008_fix_circles_table.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🔄 Running migration 008: Fix circles table');
        await sql.unsafe(migrationSQL);
        console.log('✅ Migration 008 completed successfully');
        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 008 failed:', error);
        await sql.end();
        process.exit(1);
    }
}

runMigration008();
