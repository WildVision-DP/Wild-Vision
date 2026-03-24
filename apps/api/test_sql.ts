import sql from './src/db/connection';

console.log('Type of sql:', typeof sql);
console.log('Has join?', 'join' in sql);
console.log('Type of join:', typeof (sql as any).join);

/*
const frags = [sql`a=1`, sql`b=2`];
try {
    const joined = (sql as any).join(frags, sql` AND `);
    console.log('Joined successfully');
} catch (e) {
    console.error('Join failed:', e);
}
*/
// We need to wait for connection to close or it hangs?
// sql.end();
process.exit(0);
