import sql from './connection';

async function seedGeographyAndCameras() {
  console.log('🌲 Seeding geography and camera data...\n');

  try {
    // 1. Create Circles
    console.log('Creating circles...');
    const [circle1] = await sql`
      INSERT INTO circles (id, name, code, boundary)
      VALUES (
        gen_random_uuid(),
        'Karnataka Circle',
        'KA-CIRCLE-001',
        ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[75.5,11.5],[77.5,11.5],[77.5,13.5],[75.5,13.5],[75.5,11.5]]]}'), 4326)
      )
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `;
    console.log(`✓ Circle: ${circle1.name}`);

    // 2. Create Divisions
    console.log('\nCreating divisions...');
    const divisions = [
      {
        name: 'Bandipur Tiger Reserve',
        code: 'BTR-DIV-001',
        circle_id: circle1.id,
        boundary: '{"type":"Polygon","coordinates":[[[76.5,11.5],[77.0,11.5],[77.0,12.0],[76.5,12.0],[76.5,11.5]]]}'
      },
      {
        name: 'Nagarhole National Park',
        code: 'NNP-DIV-002',
        circle_id: circle1.id,
        boundary: '{"type":"Polygon","coordinates":[[[76.0,12.0],[76.5,12.0],[76.5,12.5],[76.0,12.5],[76.0,12.0]]]}'
      },
      {
        name: 'Kabini Wildlife Sanctuary',
        code: 'KWS-DIV-003',
        circle_id: circle1.id,
        boundary: '{"type":"Polygon","coordinates":[[[76.0,11.5],[76.5,11.5],[76.5,12.0],[76.0,12.0],[76.0,11.5]]]}'
      }
    ];

    const divisionIds: any[] = [];
    for (const div of divisions) {
      const [division] = await sql`
        INSERT INTO divisions (id, name, code, circle_id, boundary)
        VALUES (
          gen_random_uuid(),
          ${div.name},
          ${div.code},
          ${div.circle_id},
          ST_SetSRID(ST_GeomFromGeoJSON(${div.boundary}), 4326)
        )
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, code
      `;
      divisionIds.push(division);
      console.log(`✓ Division: ${division.name} (${division.code})`);
    }

    // 3. Create Ranges
    console.log('\nCreating ranges...');
    const ranges = [
      {
        name: 'Bandipur North Range',
        code: 'BTR-RNG-N01',
        division_id: divisionIds[0].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.5,11.7],[76.75,11.7],[76.75,12.0],[76.5,12.0],[76.5,11.7]]]}'
      },
      {
        name: 'Bandipur South Range',
        code: 'BTR-RNG-S01',
        division_id: divisionIds[0].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.5,11.5],[76.75,11.5],[76.75,11.7],[76.5,11.7],[76.5,11.5]]]}'
      },
      {
        name: 'Nagarhole East Range',
        code: 'NNP-RNG-E01',
        division_id: divisionIds[1].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.25,12.0],[76.5,12.0],[76.5,12.25],[76.25,12.25],[76.25,12.0]]]}'
      },
      {
        name: 'Kabini Core Range',
        code: 'KWS-RNG-C01',
        division_id: divisionIds[2].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.0,11.7],[76.25,11.7],[76.25,12.0],[76.0,12.0],[76.0,11.7]]]}'
      }
    ];

    const rangeIds: any[] = [];
    for (const rng of ranges) {
      const [range] = await sql`
        INSERT INTO ranges (id, name, code, division_id, boundary)
        VALUES (
          gen_random_uuid(),
          ${rng.name},
          ${rng.code},
          ${rng.division_id},
          ST_SetSRID(ST_GeomFromGeoJSON(${rng.boundary}), 4326)
        )
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, code
      `;
      rangeIds.push(range);
      console.log(`✓ Range: ${range.name} (${range.code})`);
    }

    // 4. Create Beats
    console.log('\nCreating beats...');
    const beats = [
      {
        name: 'Mangala Beat',
        code: 'BTR-RNG-N01-BT01',
        range_id: rangeIds[0].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.5,11.85],[76.625,11.85],[76.625,12.0],[76.5,12.0],[76.5,11.85]]]}'
      },
      {
        name: 'Kundkere Beat',
        code: 'BTR-RNG-N01-BT02',
        range_id: rangeIds[0].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.625,11.85],[76.75,11.85],[76.75,12.0],[76.625,12.0],[76.625,11.85]]]}'
      },
      {
        name: 'Moolehole Beat',
        code: 'BTR-RNG-S01-BT01',
        range_id: rangeIds[1].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.5,11.5],[76.625,11.5],[76.625,11.65],[76.5,11.65],[76.5,11.5]]]}'
      },
      {
        name: 'Bandipur Core Beat',
        code: 'BTR-RNG-S01-BT02',
        range_id: rangeIds[1].id,
        boundary: '{"type":"Polygon","coordinates":[[[76.625,11.5],[76.75,11.5],[76.75,11.65],[76.625,11.65],[76.625,11.5]]]}'
      }
    ];

    const beatIds: any[] = [];
    for (const bt of beats) {
      const [beat] = await sql`
        INSERT INTO beats (id, name, code, range_id, boundary)
        VALUES (
          gen_random_uuid(),
          ${bt.name},
          ${bt.code},
          ${bt.range_id},
          ST_SetSRID(ST_GeomFromGeoJSON(${bt.boundary}), 4326)
        )
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name, code
      `;
      beatIds.push(beat);
      console.log(`✓ Beat: ${beat.name} (${beat.code})`);
    }

    // 5. Get admin user
    const [admin] = await sql`SELECT id FROM users WHERE email = 'admin@wildvision.gov.in' LIMIT 1`;

    // 6. Create Cameras with complete details
    console.log('\nCreating cameras with full details...');
    const cameras = [
      {
        camera_id: 'BTR-CAM-N01-001',
        division_id: divisionIds[0].id,
        range_id: rangeIds[0].id,
        beat_id: beatIds[0].id,
        latitude: 11.92,
        longitude: 76.55,
        camera_model: 'Bushnell Trophy Cam HD',
        serial_number: 'BUSH-2024-0001',
        install_date: '2024-06-15',
        status: 'active',
        notes: 'Near water hole, tiger corridor'
      },
      {
        camera_id: 'BTR-CAM-N01-002',
        division_id: divisionIds[0].id,
        range_id: rangeIds[0].id,
        beat_id: beatIds[1].id,
        latitude: 11.95,
        longitude: 76.70,
        camera_model: 'Cuddeback CuddeLink',
        serial_number: 'CUDD-2024-0002',
        install_date: '2024-06-20',
        status: 'active',
        notes: 'Elephant migration path'
      },
      {
        camera_id: 'BTR-CAM-S01-003',
        division_id: divisionIds[0].id,
        range_id: rangeIds[1].id,
        beat_id: beatIds[2].id,
        latitude: 11.58,
        longitude: 76.62,
        camera_model: 'Reconyx HyperFire',
        serial_number: 'RECO-2024-0003',
        install_date: '2024-07-01',
        status: 'active',
        notes: 'Leopard sighting area'
      },
      {
        camera_id: 'BTR-CAM-S01-004',
        division_id: divisionIds[0].id,
        range_id: rangeIds[1].id,
        beat_id: beatIds[3].id,
        latitude: 11.60,
        longitude: 76.68,
        camera_model: 'Bushnell Trophy Cam HD',
        serial_number: 'BUSH-2024-0004',
        install_date: '2024-07-10',
        status: 'active',
        notes: 'Core tiger habitat'
      },
      {
        camera_id: 'NNP-CAM-E01-005',
        division_id: divisionIds[1].id,
        range_id: rangeIds[2].id,
        beat_id: null,
        latitude: 12.15,
        longitude: 76.35,
        camera_model: 'Spypoint LINK-MICRO-LTE',
        serial_number: 'SPYP-2024-0005',
        install_date: '2024-08-01',
        status: 'active',
        notes: 'Cellular enabled camera'
      },
      {
        camera_id: 'KWS-CAM-C01-006',
        division_id: divisionIds[2].id,
        range_id: rangeIds[3].id,
        beat_id: null,
        latitude: 11.85,
        longitude: 76.12,
        camera_model: 'Browning Strike Force',
        serial_number: 'BROW-2024-0006',
        install_date: '2024-08-15',
        status: 'active',
        notes: 'Kabini reservoir area'
      },
      {
        camera_id: 'BTR-CAM-N01-007',
        division_id: divisionIds[0].id,
        range_id: rangeIds[0].id,
        beat_id: beatIds[0].id,
        latitude: 11.88,
        longitude: 76.58,
        camera_model: 'Bushnell Trophy Cam HD',
        serial_number: 'BUSH-2024-0007',
        install_date: '2024-09-01',
        status: 'maintenance',
        notes: 'Battery replacement needed'
      },
      {
        camera_id: 'BTR-CAM-S01-008',
        division_id: divisionIds[0].id,
        range_id: rangeIds[1].id,
        beat_id: beatIds[2].id,
        latitude: 11.55,
        longitude: 76.65,
        camera_model: 'Reconyx HyperFire',
        serial_number: 'RECO-2024-0008',
        install_date: '2024-09-10',
        status: 'inactive',
        notes: 'Removed for repositioning'
      }
    ];

    for (const cam of cameras) {
      const [camera] = await sql`
        INSERT INTO cameras (
          camera_id, division_id, range_id, beat_id,
          latitude, longitude, camera_model, serial_number,
          install_date, status, notes, created_by
        ) VALUES (
          ${cam.camera_id}, ${cam.division_id}, ${cam.range_id}, ${cam.beat_id},
          ${cam.latitude}, ${cam.longitude}, ${cam.camera_model}, ${cam.serial_number},
          ${cam.install_date}, ${cam.status}, ${cam.notes}, ${admin.id}
        )
        ON CONFLICT (camera_id) DO UPDATE SET
          camera_model = EXCLUDED.camera_model,
          serial_number = EXCLUDED.serial_number,
          install_date = EXCLUDED.install_date,
          status = EXCLUDED.status
        RETURNING camera_id, status
      `;
      console.log(`✓ Camera: ${camera.camera_id} [${camera.status}]`);
    }

    // 7. Create user assignments for testing
    console.log('\nCreating user assignments...');
    const [officer] = await sql`SELECT id FROM users WHERE email = 'officer@wildvision.gov.in' LIMIT 1`;
    
    if (officer) {
      const [existing] = await sql`
        SELECT id FROM user_assignments 
        WHERE user_id = ${officer.id} AND division_id = ${divisionIds[0].id} AND range_id = ${rangeIds[0].id}
      `;
      
      if (!existing) {
        await sql`
          INSERT INTO user_assignments (user_id, division_id, range_id, is_primary)
          VALUES (${officer.id}, ${divisionIds[0].id}, ${rangeIds[0].id}, true)
        `;
        console.log('✓ Assigned officer to Bandipur North Range');
      } else {
        console.log('✓ Officer already assigned to Bandipur North Range');
      }
    }

    console.log('\n✅ Geography and camera seeding complete!');
    console.log('\n📊 Summary:');
    console.log('  - 1 Circle');
    console.log('  - 3 Divisions');
    console.log('  - 4 Ranges');
    console.log('  - 4 Beats');
    console.log('  - 8 Cameras (6 active, 1 maintenance, 1 inactive)');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seedGeographyAndCameras();
