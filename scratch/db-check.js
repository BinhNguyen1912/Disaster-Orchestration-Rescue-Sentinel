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

  const filePath = path.join(__dirname, '../src/infrastructure/database/seeds/data/administrative-unit.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const units = JSON.parse(raw);
  const pIds = new Set(units.map(u => u.provinceId));
  console.log('Distinct provinceId in administrative-unit.json:', Array.from(pIds));

  const dbIds = await client.query('SELECT DISTINCT "provinceId" FROM administrative_unit');
  console.log('Distinct provinceId in DB administrative_unit table:', dbIds.rows.map(r => r.provinceId));

  await client.end();
}
run().catch(console.error);
