import sql from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function runMigration(migrationFile: string) {
    try {
        const migrationPath = join(process.cwd(), '../../infra/db/migrations', migrationFile);
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log(`🔄 Running migration: ${migrationFile}`);
        await sql.unsafe(migrationSQL);
        console.log(`✅ Migration completed: ${migrationFile}`);
        return true;
    } catch (error) {
        console.error(`❌ Migration failed: ${migrationFile}`, error);
        return false;
    }
}

export async function runAllMigrations() {
    const migrations = [
        '001_create_users_roles.sql',
    ];

    for (const migration of migrations) {
        const success = await runMigration(migration);
        if (!success) {
            console.error('Migration process stopped due to error');
            process.exit(1);
        }
    }

    console.log('✅ All migrations completed successfully');
}

// Run migrations if this file is executed directly
if (import.meta.main) {
    await runAllMigrations();
    process.exit(0);
}
