import sql from './src/db/connection';

async function fix() {
    try {
        console.log('🔧 Fixing Camera Data...');

        // 1. Get a valid Beat
        const [beat] = await sql`SELECT id, name, range_id, code FROM beats LIMIT 1`;
        if (!beat) throw new Error('No beats found!');
        console.log(`Using Beat: ${beat.name} (${beat.code})`);

        // 2. Get Range and Division from Beat
        const [range] = await sql`SELECT id, division_id FROM ranges WHERE id = ${beat.range_id}`;
        const divisionId = range.division_id;

        // 3. Update Cameras with NULL beat_id
        const result = await sql`
            UPDATE cameras 
            SET 
                beat_id = ${beat.id},
                range_id = ${beat.range_id},
                division_id = ${divisionId}
            WHERE beat_id IS NULL OR range_id IS NULL OR division_id IS NULL
            RETURNING id, camera_id
        `;

        console.log(`✅ Updated ${result.length} cameras to belong to ${beat.name}`);

        // 4. Verify
        const verification = await sql`SELECT count(*) FROM cameras WHERE beat_id = ${beat.id}`;
        console.log(`Total cameras in ${beat.name}: ${verification[0].count}`);

    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await sql.end();
    }
}

fix();
