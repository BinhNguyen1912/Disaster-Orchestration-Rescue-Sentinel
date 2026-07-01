const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123123',
  database: process.env.DB_NAME || 'rescue_system',
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT count(*) FROM "sos_request"');
  console.log('Total SOS requests in DB:', res.rows[0].count);
  await client.end();
}

run().catch(console.error);
