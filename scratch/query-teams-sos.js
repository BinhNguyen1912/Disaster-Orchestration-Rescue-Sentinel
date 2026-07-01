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
  console.log('--- DATABASE CONNECTION SUCCESSFUL ---');

  // 1. Query SOS Requests
  const sosRes = await client.query('SELECT id, status, "provinceId", severity, "trappedPeopleCount", "requiresEquipment", "assignedTeamId" FROM sos_request WHERE status IN (\'PENDING\', \'PENDING_SPECIALIST\')');
  console.log('\n--- PENDING/PENDING_SPECIALIST SOS REQUESTS ---');
  console.table(sosRes.rows);

  // 2. Query Rescue Teams
  const teamRes = await client.query('SELECT id, name, status, "provinceId", "maxCapacity", "activeCasesCount" FROM rescue_team');
  console.log('\n--- RESCUE TEAMS ---');
  console.table(teamRes.rows);

  await client.end();
}
run().catch(console.error);
