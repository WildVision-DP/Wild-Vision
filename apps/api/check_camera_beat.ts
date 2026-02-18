import sql from './src/db/connection';

async function check() {
    try {
        console.log('--- Inspecting Beats and Cameras ---');

        // 1. Get Beat 1
        const [beat] = await sql`SELECT id, name, code FROM beats WHERE code = 'BT-001'`;
        if (!beat) {
            console.log('Beat BT-001 not found!');
            return;
        }
        console.log('Beat found:', beat);

        // 2. Get Cameras in this Beat
        const cameras = await sql`SELECT id, camera_id, beat_id FROM cameras WHERE beat_id = ${beat.id}`;
        console.log(`Cameras with beat_id=${beat.id}:`, cameras.length);
        cameras.forEach(c => console.log(' - ', c.camera_id, c.id));

        // 3. Get All Cameras and their beat_ids
        const allCameras = await sql`SELECT id, camera_id, beat_id FROM cameras LIMIT 5`;
        console.log('First 5 cameras in DB:');
        allCameras.forEach(c => console.log(' - ', c.camera_id, 'beat_id:', c.beat_id));

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await sql.end();
    }
}

check();
