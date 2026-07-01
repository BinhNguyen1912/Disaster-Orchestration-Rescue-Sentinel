import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123123@localhost:5433/rescue_system?schema=public'
  });
  await client.connect();

  console.log('🧹 Clearing all SOS requests, history, and queues...');
  
  // Truncate tables with CASCADE to handle foreign key dependencies
  await client.query('TRUNCATE TABLE sos_status_history, dispatch_queue, sos_request CASCADE');
  
  console.log('✅ Database cleared successfully!');
  await client.end();
}

main().catch(console.error);
