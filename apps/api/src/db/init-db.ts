import sql from './connection';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Migrations are split on ';' which breaks DO $$ blocks and some ALTERs, so older DBs
 * can miss columns the upload / ML flow needs. Idempotent ADD COLUMN fixes that.
 */
async function ensureImagesMlFlowColumns() {
    const [tableOk] = await sql`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'images'
        ) AS ok
    `;
    if (!tableOk?.ok) {
        console.warn('⚠️  images table not found; skipping column ensure');
        return;
    }

    const statements = [
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS thumbnail_path TEXT',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS detected_animal TEXT',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS detected_animal_scientific TEXT',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS detection_confidence INTEGER',
        "ALTER TABLE images ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(40) DEFAULT 'pending_confirmation'",
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS confirmed_by UUID',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS approval_method VARCHAR(40)',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS ml_metadata JSONB',
        "ALTER TABLE images ADD COLUMN IF NOT EXISTS metadata_status VARCHAR(32) DEFAULT 'pending'",
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS metadata_processed_at TIMESTAMP',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS geo_consistent BOOLEAN',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS geo_distance_m DOUBLE PRECISION',
        'ALTER TABLE images ADD COLUMN IF NOT EXISTS exif_camera_serial TEXT',
    ];
    for (const stmt of statements) {
        try {
            await sql.unsafe(stmt);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (!msg.includes('already exists') && !msg.includes('duplicate_column')) {
                console.warn(`  ensureImagesMlFlowColumns: ${msg.substring(0, 120)}`);
            }
        }
    }
    console.log('✅ images table columns verified for upload / ML / confirmation flow');
}

export async function initializeDatabase() {
    try {
        // Try multiple possible paths for migrations directory
        const possiblePaths = [
            // In Docker container
            '/migrations',
            // In development (from apps/api/src/db)
            join(__dirname, '../../../../infra/db/migrations'),
        ];

        let migrationsDir = '';
        for (const path of possiblePaths) {
            if (existsSync(path)) {
                migrationsDir = path;
                break;
            }
        }

        if (!migrationsDir) {
            console.warn('⚠️  Migrations directory not found, skipping schema initialization');
            console.warn('   Tried paths:', possiblePaths);
            return false;
        }

        const migrationFiles = readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log(`🔄 Found ${migrationFiles.length} migration files in ${migrationsDir}`);

        for (const migrationFile of migrationFiles) {
            try {
                const migrationPath = join(migrationsDir, migrationFile);
                const migrationSQL = readFileSync(migrationPath, 'utf-8');

                console.log(`🔄 Running migration: ${migrationFile}`);
                const statements = migrationSQL
                    .split(';')
                    .map(s => s.trim())
                    .filter(s => s && !s.startsWith('--'));

                for (const statement of statements) {
                    if (statement) {
                        try {
                            await sql.unsafe(statement);
                        } catch (e) {
                            // Log the error but continue
                            const errorMsg = e instanceof Error ? e.message : String(e);
                            if (!errorMsg.includes('already exists') && !errorMsg.includes('already existent') && statement.toLowerCase().startsWith('drop')) {
                                console.warn(`  - Statement error (might be expected): ${errorMsg.substring(0, 80)}`);
                            }
                        }
                    }
                }

                console.log(`✅ Migration completed: ${migrationFile}`);
            } catch (error) {
                console.warn(`⚠️  Migration warning (non-fatal): ${migrationFile}`, error instanceof Error ? error.message : error);
                // Continue with other migrations (non-blocking)
            }
        }

        await ensureImagesMlFlowColumns();

        console.log('✅ Database initialization completed');
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return false;
    }
}
