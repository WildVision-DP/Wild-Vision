import sql from './src/db/connection';

async function check() {
    try {
        const [users] = await sql`SELECT count(*) FROM users`;
        const [circles] = await sql`SELECT count(*) FROM circles`;
        const [divisions] = await sql`SELECT count(*) FROM divisions`;
        const [ranges] = await sql`SELECT count(*) FROM ranges`;
        const [beats] = await sql`SELECT count(*) FROM beats`;
        const [cameras] = await sql`SELECT count(*) FROM cameras`;

        console.log('--- DB COUNTS ---');
        console.log('Users:', users.count);
        console.log('Circles:', circles.count);
        console.log('Divisions:', divisions.count);
        console.log('Ranges:', ranges.count);
        console.log('Beats:', beats.count);
        console.log('Cameras:', cameras.count);
        console.log('-----------------');
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await sql.end();
    }
}

check();
