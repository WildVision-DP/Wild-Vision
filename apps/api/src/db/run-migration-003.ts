import sql from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration003() {
    try {
        const migrationPath = join(__dirname, '../../../../infra/db/migrations/003_create_sessions_audit.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('🔄 Running migration: 003_create_sessions_audit.sql');
        await sql.unsafe(migrationSQL);
        console.log('✅ Migration 003 completed successfully');

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration 003 failed:', error);
        await sql.end();
        process.exit(1);
    }
}

runMigration003();
