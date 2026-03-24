import sql from './connection';

async function testDivisions() {
  try {
    console.log('Testing divisions query...');
    
    const result = await sql`
      SELECT id, name, code FROM divisions WHERE deleted_at IS NULL LIMIT 3
    `;
    
    console.log('✓ Result:', result);
    
  } catch (error) {
    console.error('✗ Error:', error);
  } finally {
    await sql.end();
  }
}

testDivisions();
