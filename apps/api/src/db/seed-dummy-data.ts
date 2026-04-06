import sql from './connection';
import { hashPassword } from '../utils/password';
import { randomUUID } from 'crypto';

// Random helper generators
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randPick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

async function seedDummyData() {
  console.log('🌲 Seeding Comprehensive Dummy Data...\n');

  try {
    // 1. Roles
    console.log('Fetching roles...');
    const rolesList = await sql`SELECT id, name, level FROM roles`;
    const roleAdmin = rolesList.find(r => r.name === 'Admin');
    const roleDfo = rolesList.find(r => r.name === 'Divisional Officer');
    const roleRfo = rolesList.find(r => r.name === 'Range Officer');
    const roleGuard = rolesList.find(r => r.name === 'Ground Staff');

    if (!roleAdmin || !roleDfo || !roleRfo || !roleGuard) {
      throw new Error('Roles are missing. Run 001_create_users_roles.sql first.');
    }

    // 2. Users (Field Staff)
    console.log('Seeding mock users...');
    const users = [
      { email: 'amit.patil@forest.gov.in', name: 'Amit Patil', role: roleDfo.id },
      { email: 'suresh.kumar@forest.gov.in', name: 'Suresh Kumar', role: roleRfo.id },
      { email: 'vikram.singh@forest.gov.in', name: 'Vikram Singh', role: roleGuard.id },
      { email: 'priya.sharma@forest.gov.in', name: 'Priya Sharma', role: roleGuard.id },
    ];

    const userMap: Record<string, string> = {};
    const passHash = await hashPassword('password123'); // Simple password for all
    
    for (const u of users) {
      const [inserted] = await sql`
        INSERT INTO users (email, password_hash, full_name, role_id)
        VALUES (${u.email}, ${passHash}, ${u.name}, ${u.role})
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id
      `;
      userMap[u.name] = inserted.id;
      console.log(`✓ User: ${u.name} (${u.email})`);
    }

    // 3. Geography (New Circle: Maharashtra)
    console.log('\nSeeding Geography (Tadoba Andhari)...');
    const [circle] = await sql`
      INSERT INTO circles (id, name, code, boundary)
      VALUES (
        gen_random_uuid(),
        'Maharashtra Circle',
        'MH-CIRCLE-001',
        ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[79.0,20.0],[80.0,20.0],[80.0,21.0],[79.0,21.0],[79.0,20.0]]]}'), 4326)
      )
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `;

    // Division
    const [division] = await sql`
      INSERT INTO divisions (id, name, code, circle_id, boundary)
      VALUES (
        gen_random_uuid(),
        'Tadoba Andhari Tiger Reserve',
        'TATR-DIV-001',
        ${circle.id},
        ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[79.2,20.1],[79.5,20.1],[79.5,20.4],[79.2,20.4],[79.2,20.1]]]}'), 4326)
      )
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name, code
    `;

    // Ranges
    const ranges = [
      { name: 'Tadoba Range', code: 'TATR-RNG-01', coords: [[[79.2,20.1],[79.35,20.1],[79.35,20.4],[79.2,20.4],[79.2,20.1]]] },
      { name: 'Kolsa Range',  code: 'TATR-RNG-02', coords: [[[79.35,20.1],[79.5,20.1],[79.5,20.4],[79.35,20.4],[79.35,20.1]]] },
    ];
    
    const rangeIds = [];
    for (const r of ranges) {
      const geojson = JSON.stringify({ type: 'Polygon', coordinates: r.coords });
      const [rng] = await sql`
        INSERT INTO ranges (id, name, code, division_id, boundary)
        VALUES (
          gen_random_uuid(), ${r.name}, ${r.code}, ${division.id},
          ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)
        )
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      rangeIds.push(rng.id);
    }

    // Beats
    const beats = [
      { name: 'Tadoba North Beat', code: 'TATR-BT-01', range_id: rangeIds[0], coords: [[[79.2,20.25],[79.35,20.25],[79.35,20.4],[79.2,20.4],[79.2,20.25]]] },
      { name: 'Tadoba South Beat', code: 'TATR-BT-02', range_id: rangeIds[0], coords: [[[79.2,20.1],[79.35,20.1],[79.35,20.25],[79.2,20.25],[79.2,20.1]]] },
      { name: 'Kolsa Core Beat', code: 'TATR-BT-03', range_id: rangeIds[1], coords: [[[79.35,20.1],[79.5,20.1],[79.5,20.4],[79.35,20.4],[79.35,20.1]]] },
    ];

    const beatIds = [];
    for (const b of beats) {
      const geojson = JSON.stringify({ type: 'Polygon', coordinates: b.coords });
      const [bt] = await sql`
        INSERT INTO beats (id, name, code, range_id, boundary)
        VALUES (
          gen_random_uuid(), ${b.name}, ${b.code}, ${b.range_id},
          ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326)
        )
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;
      beatIds.push(bt.id);
    }

    // 4. User Assignments
    await sql`
      INSERT INTO user_assignments (user_id, division_id, range_id, is_primary)
      VALUES 
        (${userMap['Suresh Kumar']}, ${division.id}, ${rangeIds[0]}, true),
        (${userMap['Vikram Singh']}, ${division.id}, ${rangeIds[0]}, true),
        (${userMap['Priya Sharma']}, ${division.id}, ${rangeIds[1]}, true)
    `;

    // 5. Cameras
    console.log('\nSeeding 25 Mock Cameras...');
    const cameraModels = ['Bushnell Trophy Cam HD', 'Reconyx HyperFire', 'Cuddeback CuddeLink', 'Browning Strike Force'];
    const cameraStatuses = ['active', 'active', 'active', 'active', 'maintenance', 'inactive'];
    const insertedCameras = [];

    let latBase = 20.1;
    let lngBase = 79.2;
    for (let i = 1; i <= 25; i++) {
       const [cam] = await sql`
         INSERT INTO cameras (
           camera_id, division_id, range_id, beat_id,
           latitude, longitude, camera_model, serial_number,
           install_date, status, notes, created_by
         ) VALUES (
           ${'TATR-CAM-' + i.toString().padStart(3, '0')},
           ${division.id},
           ${randPick(rangeIds)},
           ${randPick(beatIds)},
           ${latBase + (Math.random() * 0.2)},
           ${lngBase + (Math.random() * 0.2)},
           ${randPick(cameraModels)},
           ${'DUMMY-SN-' + i},
           ${new Date(Date.now() - randInt(30, 300) * 86400000).toISOString().split('T')[0]},
           ${randPick(cameraStatuses)},
           ${'Dummy data camera ' + i},
           ${userMap['Amit Patil']}
         )
         ON CONFLICT (camera_id) DO UPDATE SET status = EXCLUDED.status
         RETURNING id, camera_id
       `;
       insertedCameras.push(cam);
    }

    // 6. Events / Images
    console.log('\nGenerating thousands of mock AI image events...');
    const animalTypes = ['Tiger', 'Tiger', 'Leopard', 'Elephant', 'Wild Boar', 'Spotted Deer', 'Sambar', 'Macaque', 'Human', 'Vehicle'];
    const animalsWithMultiTags = ['Tiger', 'Leopard', 'Elephant'];
    
    let totalImages = 0;
    
    // Create ~100 events per active camera over the last 30 days
    for (const cam of insertedCameras) {
      const numEvents = randInt(50, 150);
      
      for(let j = 0; j < numEvents; j++) {
        const animal = randPick(animalTypes);
        const confidence = (randInt(750, 999) / 1000).toFixed(3);
        
        let aiMetadata: any = {
           detections: [
             { class: animal, confidence: parseFloat(confidence), box: [randInt(0,50), randInt(0,50), randInt(100,200), randInt(100,200)] }
           ],
           weather: 'clear',
           temperature: randInt(15, 38)
        };

        // Add extra sub tags
        if(animalsWithMultiTags.includes(animal) && Math.random() > 0.5) {
            aiMetadata.detections[0].attributes = { age: randPick(['Adult', 'Sub-adult', 'Cub']), sex: randPick(['Male', 'Female', 'Unknown']) };
        }

        const dateTaken = new Date(Date.now() - randInt(0, 30 * 24 * 60 * 60 * 1000));
        
        await sql`
          INSERT INTO images (
             camera_id, file_path, original_filename, file_size, mime_type,
             taken_at, uploaded_at, metadata, status, metadata_status, geo_consistent
          ) VALUES (
             ${cam.id},
             ${`/mock/tatr/${cam.camera_id}/${randomUUID()}.jpg`},
             ${`DSC_${randInt(1000, 9999)}.JPG`},
             ${randInt(1024000, 5048000)},
             'image/jpeg',
             ${dateTaken.toISOString()},
             ${new Date(dateTaken.getTime() + 1000 * 60 * randInt(1, 1440)).toISOString()},
             ${sql.json(aiMetadata)},
             'processed',
             'completed',
             true
          )
        `;
        totalImages++;
      }
    }
    
    console.log(`\n✅ Generated ${totalImages} mock images/events with AI metadata!`);
    console.log('✅ Master Dummy Data Seed complete.');

  } catch (error) {
    console.error('❌ Dummy seeding failed:', error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

seedDummyData();
