import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123123@localhost:5433/rescue_system?schema=public'
  });
  await client.connect();

  const userRes = await client.query('SELECT DISTINCT "provinceId" FROM "user"');
  console.log('DISTINCT user provinceIds:', userRes.rows);

  const teamRes = await client.query('SELECT DISTINCT "provinceId" FROM "rescue_team"');
  console.log('DISTINCT team provinceIds:', teamRes.rows);

  await client.end();
}

main().catch(console.error);
