import sql from './apps/api/src/db/connection.js';

async function main() {
    const res = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'images' 
        AND column_name IN ('approval_method', 'auto_approved')
    `;
    console.log(res);
    process.exit(0);
}
main();
