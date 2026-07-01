const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

let env = {};
try {
  const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^["']|["']$)/g, '');
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
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'rescue_team'
  `);
  console.log('Columns of rescue_team:', res.rows);
  
  // Also check which column has value 104 in rescue_team
  const rowsRes = await client.query('SELECT * FROM rescue_team');
  console.log('Rescue teams:', rowsRes.rows);
  
  await client.end();
}

run().catch(console.error);
