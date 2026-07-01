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

  // 1. Read administrative-unit.json
  const filePath = path.join(__dirname, '../src/infrastructure/database/seeds/data/administrative-unit.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const allUnits = JSON.parse(raw);

  // Filter HCMC units (provinceId = 2)
  const hcmUnits = allUnits.filter(u => u.provinceId === 2);
  console.log(`Found ${hcmUnits.length} HCMC units in JSON.`);

  // Group into districts and wards
  const districts = hcmUnits.filter(u => u.parentId === null);
  const wards = hcmUnits.filter(u => u.parentId !== null);

  console.log(`Districts: ${districts.length}, Wards: ${wards.length}`);

  // Map of JSON ID -> DB ID
  const idMap = {};

  // 2. Seed Districts
  console.log('Seeding districts...');
  for (const d of districts) {
    const checkRes = await client.query('SELECT id FROM administrative_unit WHERE code = $1 AND "provinceId" = 2', [d.code]);
    let dbId;
    if (checkRes.rows.length > 0) {
      dbId = checkRes.rows[0].id;
      console.log(`District ${d.name} (${d.code}) already exists with ID: ${dbId}`);
    } else {
      const insertRes = await client.query(
        `INSERT INTO administrative_unit ("provinceId", "parentId", type, code, name, "boundary", "centerPoint") 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [d.provinceId, null, d.type, d.code, d.name, d.boundary, d.centerPoint]
      );
      dbId = insertRes.rows[0].id;
      console.log(`Inserted district ${d.name} (${d.code}) with ID: ${dbId}`);
    }
    idMap[d.id] = dbId;
  }

  // 3. Seed Wards
  console.log('Seeding wards...');
  let wardSuccess = 0;
  for (const w of wards) {
    const dbParentId = idMap[w.parentId];
    if (!dbParentId) {
      console.warn(`Warning: Parent ID ${w.parentId} not resolved for ward ${w.name} (${w.code})`);
      continue;
    }

    const checkRes = await client.query('SELECT id FROM administrative_unit WHERE code = $1 AND "provinceId" = 2', [w.code]);
    let dbId;
    if (checkRes.rows.length > 0) {
      dbId = checkRes.rows[0].id;
      // Update parentId just in case
      await client.query('UPDATE administrative_unit SET "parentId" = $1 WHERE id = $2', [dbParentId, dbId]);
    } else {
      const insertRes = await client.query(
        `INSERT INTO administrative_unit ("provinceId", "parentId", type, code, name, "boundary", "centerPoint") 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [w.provinceId, dbParentId, w.type, w.code, w.name, w.boundary, w.centerPoint]
      );
      dbId = insertRes.rows[0].id;
      wardSuccess++;
    }
  }

  console.log(`✅ Completed seeding HCMC units. Wards inserted/checked: ${wardSuccess}`);

  await client.end();
}

run().catch(console.error);
