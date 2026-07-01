const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

let env = {};
try {
  const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/(^["']|["']$)/g, '');
      env[key] = value;
    }
  });
} catch (e) {}

const client = new Client({
  host: env.DB_HOST || 'localhost',
  port: parseInt(env.DB_PORT || '5433', 10),
  user: env.DB_USERNAME || 'postgres',
  password: env.DB_PASSWORD || 'postgres',
  database: env.DB_DATABASE || 'rescue_system',
});

async function run() {
  await client.connect();
  console.log('Database connected!');

  // Update provinceId for SOS requests 7, 8, 9 to 28 (TP.HCM)
  const result = await client.query('UPDATE sos_request SET "provinceId" = 28 WHERE id IN (7, 8, 9)');
  console.log(`Updated ${result.rowCount} SOS requests' provinceId to 28.`);

  await client.end();
}
run().catch(console.error);
