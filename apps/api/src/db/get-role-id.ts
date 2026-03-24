import sql from './connection';

async function getRoleId() {
    const [adminRole] = await sql`SELECT id FROM roles WHERE name = 'Admin' LIMIT 1`;
    console.log('Admin Role ID:', adminRole.id);
    await sql.end();
}

getRoleId();
