import sql from './connection';
import { hashPassword } from '../utils/password';

async function seed() {
    try {
        console.log('🌱 Seeding database...');

        // 1. Get Roles
        const [adminRole] = await sql`SELECT id FROM roles WHERE name = 'Admin'`;
        const [divRole] = await sql`SELECT id FROM roles WHERE name = 'Divisional Officer'`;

        if (!adminRole) throw new Error('Admin role not found! Run migrations first.');

        // 2. Seed Users
        const adminEmail = 'admin@wildvision.gov.in';
        const [existingAdmin] = await sql`SELECT id FROM users WHERE email = ${adminEmail}`;
        if (!existingAdmin) {
            const hash = await hashPassword('admin123');
            await sql`INSERT INTO users (email, password_hash, full_name, role_id) VALUES (${adminEmail}, ${hash}, 'System Administrator', ${adminRole.id})`;
            console.log('✅ Admin user created');
        }

        const officerEmail = 'officer@wildvision.gov.in';
        const [existingOfficer] = await sql`SELECT id FROM users WHERE email = ${officerEmail}`;
        let officerId = existingOfficer?.id;
        if (!existingOfficer) {
            const hash = await hashPassword('officer123');
            const [user] = await sql`INSERT INTO users (email, password_hash, full_name, role_id) VALUES (${officerEmail}, ${hash}, 'Rajesh Verma (DFO)', ${divRole.id}) RETURNING id`;
            officerId = user.id;
            console.log('✅ Divisional Officer created');
        }

        // 3. Seed Administrative Boundaries (Geospatial)
        console.log('🌍 Seeding administrative boundaries...');

        // Circle: Project Tiger
        const [existingCircle] = await sql`SELECT id FROM circles WHERE code = 'CIR-001'`;
        let circleId = existingCircle?.id;

        if (!circleId) {
            const [cir] = await sql`
                INSERT INTO circles (name, code)
                VALUES ('Project Tiger Circle', 'CIR-001')
                RETURNING id
            `;
            circleId = cir.id;
            console.log('   + Created Circle: Project Tiger Circle');
        }

        // Division: Bandipur Tiger Reserve
        const [existingDiv] = await sql`SELECT id FROM divisions WHERE code = 'DIV-001'`;
        let divId = existingDiv?.id;

        if (!divId) {
            // Approx box around Bandipur
            const divPoly = 'POLYGON((76.1 11.5, 76.7 11.5, 76.7 11.9, 76.1 11.9, 76.1 11.5))';
            const [div] = await sql`
                INSERT INTO divisions (name, code, boundary, circle_id)
                VALUES ('Bandipur Tiger Reserve', 'DIV-001', ST_GeomFromText(${divPoly}, 4326), ${circleId})
                RETURNING id
            `;
            divId = div.id;
            console.log('   + Created Division: Bandipur Tiger Reserve');
        }

        // Range: Bandipur Range
        const [existingRange] = await sql`SELECT id FROM ranges WHERE code = 'RNG-001'`;
        let rangeId = existingRange?.id;

        if (!rangeId && divId) {
            const rangePoly = 'POLYGON((76.2 11.6, 76.4 11.6, 76.4 11.8, 76.2 11.8, 76.2 11.6))';
            const [rng] = await sql`
                INSERT INTO ranges (name, code, division_id, boundary)
                VALUES ('Bandipur Range', 'RNG-001', ${divId}, ST_GeomFromText(${rangePoly}, 4326))
                RETURNING id
            `;
            rangeId = rng.id;
            console.log('   + Created Range: Bandipur Range');
        }

        // Beat: Beat 1
        const [existingBeat] = await sql`SELECT id FROM beats WHERE code = 'BT-001'`;
        let beatId = existingBeat?.id;

        if (!beatId && rangeId) {
            const beatPoly = 'POLYGON((76.25 11.65, 76.35 11.65, 76.35 11.75, 76.25 11.75, 76.25 11.65))';
            const [bt] = await sql`
                INSERT INTO beats (name, code, range_id, boundary)
                VALUES ('Beat 1 - Center', 'BT-001', ${rangeId}, ST_GeomFromText(${beatPoly}, 4326))
                RETURNING id
             `;
            beatId = bt.id;
            console.log('   + Created Beat: Beat 1');
        }

        // 4. Update User Assignment (Assign DFO to Division)
        if (officerId && divId) {
            const [assignment] = await sql`SELECT id FROM user_assignments WHERE user_id = ${officerId}`;
            if (!assignment) {
                await sql`
                    INSERT INTO user_assignments (user_id, division_id, is_primary)
                    VALUES (${officerId}, ${divId}, true)
                `;
                console.log('   + Assigned DFO to Division');
            }
        }

        // 5. Seed Cameras
        const [existingCameras] = await sql`SELECT count(*) as count FROM cameras`;
        if (existingCameras.count === '0') {
            if (officerId) {
                console.log('📸 Seeding sample cameras...');

                // Camera 1 in Beat 1
                const cameras = [
                    { id: 'CAM-001', lat: 11.6608, lng: 76.6262, status: 'active', loc: 'Bandipur Tiger Reserve HQ', model: 'Hikvision DS-2CD' },
                    { id: 'CAM-002', lat: 11.7000, lng: 76.3000, status: 'active', loc: 'Beat 1 Core', model: 'Axis P1448' },
                ];

                for (const cam of cameras) {
                    await sql`
                        INSERT INTO cameras (
                            camera_id, latitude, longitude, status, notes, created_by,
                            location, -- PostGIS point
                            division_id, range_id, beat_id,
                            camera_model
                        ) VALUES (
                            ${cam.id}, ${cam.lat}, ${cam.lng}, ${cam.status}, ${cam.loc}, ${officerId},
                            ST_SetSRID(ST_MakePoint(${cam.lng}, ${cam.lat}), 4326),
                            ${divId}, ${rangeId}, ${beatId},
                            ${cam.model}
                        )
                    `;
                    console.log(`   + Created camera ${cam.id}`);
                }
                console.log('✅ Sample cameras seeded');
            }
        }

        console.log('🌱 Seed completed');
        await sql.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        await sql.end();
        process.exit(1);
    }
}

seed();
