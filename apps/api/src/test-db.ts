import { testConnection } from './db/connection';

async function main() {
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();

    if (connected) {
        console.log('✅ Database setup complete!');
        process.exit(0);
    } else {
        console.error('❌ Database connection failed');
        process.exit(1);
    }
}

main();
