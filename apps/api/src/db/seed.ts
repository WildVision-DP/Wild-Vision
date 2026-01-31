import sql from './connection';
import { hashPassword } from '../utils/password';

async function seed() {
    try {
        console.log('🌱 Seeding database...');

        // 1. Get Admin Role
        const [adminRole] = await sql`SELECT id FROM roles WHERE name = 'Admin'`;
        if (!adminRole) {
            throw new Error('Admin role not found! Run migrations first.');
        }

        // 2. Check if admin user exists
        const email = 'admin@wildvision.gov.in';
        const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;

        if (!existing) {
            console.log(`Creating admin user: ${email}`);
            const hashedPassword = await hashPassword('admin123'); // Default password

            await sql`
        INSERT INTO users (email, password_hash, full_name, role_id)
        VALUES (${email}, ${hashedPassword}, 'System Administrator', ${adminRole.id})
      `;
            console.log('✅ Admin user created successfully');
            console.log('📧 Email: admin@wildvision.gov.in');
            console.log('🔑 Password: admin123');
        } else {
            console.log('ℹ️ Admin user already exists');
        }

        // 3. Create Divisional Officer (for testing hierarchy)
        const [divRole] = await sql`SELECT id FROM roles WHERE name = 'Divisional Officer'`;
        const divEmail = 'officer@wildvision.gov.in';
        const [existingDiv] = await sql`SELECT id FROM users WHERE email = ${divEmail}`;

        if (!existingDiv) {
            console.log(`Creating divisional officer: ${divEmail}`);
            const hashedPassword = await hashPassword('officer123');

            await sql`
          INSERT INTO users (email, password_hash, full_name, role_id)
          VALUES (${divEmail}, ${hashedPassword}, 'Rajesh Verma (DFO)', ${divRole.id})
        `;
            console.log('✅ Divisional officer created successfully');
        }

        // 4. Seed Cameras
        const [existingCameras] = await sql`SELECT count(*) as count FROM cameras`;
        if (existingCameras.count === '0') {
            const [officer] = await sql`SELECT id FROM users WHERE email = ${divEmail}`;
            const officerId = officer?.id;

            if (officerId) {
                console.log('📸 Seeding sample cameras...');

                const cameras = [
                    { id: 'CAM-001', lat: 11.6608, lng: 76.6262, status: 'active', loc: 'Bandipur Tiger Reserve' },
                    { id: 'CAM-002', lat: 11.6650, lng: 76.6290, status: 'active', loc: 'Bandipur North' },
                    { id: 'CAM-003', lat: 11.6580, lng: 76.6200, status: 'inactive', loc: 'Bandipur South' },
                    { id: 'CAM-004', lat: 12.9716, lng: 77.5946, status: 'maintenance', loc: 'Bannerghatta National Park' }, // Near Bangalore
                ];

                for (const cam of cameras) {
                    await sql`
                        INSERT INTO cameras (
                            camera_id, latitude, longitude, status, notes, created_by,
                            location -- PostGIS point
                        ) VALUES (
                            ${cam.id}, ${cam.lat}, ${cam.lng}, ${cam.status}, ${cam.loc}, ${officerId},
                            ST_SetSRID(ST_MakePoint(${cam.lng}, ${cam.lat}), 4326)
                        )
                    `;
                    console.log(`   + Created camera ${cam.id} at ${cam.loc}`);
                }
                console.log('✅ Sample cameras seeded');
            }
        } else {
            console.log('ℹ️ Cameras already exist, skipping seed');
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
