import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123123@localhost:5433/rescue_system?schema=public'
  });
  await client.connect();

  console.log('🔍 Finding all tables with "provinceId" column...');
  
  const query = `
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'provinceId' 
      AND table_schema = 'public';
  `;
  
  const res = await client.query(query);
  const tables = res.rows.map(r => r.table_name);
  console.log('Tables found:', tables);

  for (const table of tables) {
    if (table === 'provinces') continue; // Do not update the master provinces table
    console.log(`⚡ Updating "provinceId" from 2 to 28 in table "${table}"...`);
    const updateRes = await client.query(`UPDATE "${table}" SET "provinceId" = 28 WHERE "provinceId" = 2`);
    console.log(`   Updated ${updateRes.rowCount} rows.`);
  }

  console.log('✅ Database provinceId sync completed!');
  await client.end();
}

main().catch(console.error);
