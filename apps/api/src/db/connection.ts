import postgres from 'postgres';

// Database connection configuration
const sql = postgres({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wildvision',
    username: process.env.DB_USER || 'wildvision_user',
    password: process.env.DB_PASSWORD || 'wildvision_dev_password',
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    idle_timeout: 20,
    connect_timeout: 10,
});

// Test connection
export async function testConnection() {
    try {
        const result = await sql`SELECT version(), PostGIS_Version() as postgis_version`;
        console.log('✅ Database connected successfully');
        console.log('PostgreSQL version:', result[0].version);
        console.log('PostGIS version:', result[0].postgis_version);
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

export default sql;
