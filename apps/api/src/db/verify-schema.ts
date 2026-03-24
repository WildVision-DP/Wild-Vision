import sql from './connection';

async function verifySchema() {
    console.log('🔍 Verifying database schema...\n');

    // Check roles
    const roles = await sql`SELECT * FROM roles ORDER BY level`;
    console.log('✅ Roles table:');
    console.table(roles.map(r => ({ name: r.name, level: r.level, description: r.description })));

    // Check tables exist
    const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
    console.log('\n✅ Tables created:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Check indexes
    const indexes = await sql`
    SELECT indexname, tablename 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `;
    console.log(`\n✅ Indexes created: ${indexes.length} total`);

    console.log('\n✅ Schema verification complete!');
}

verifySchema().then(() => process.exit(0));
