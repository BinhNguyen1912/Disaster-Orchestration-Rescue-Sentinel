const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: '123123',
    database: 'rescue_system',
  });

  await client.connect();
  console.log('Connected to DB!');

  const res = await client.query('SELECT id, email, "provinceId", "fullName" FROM "user" LIMIT 20;');
  console.table(res.rows);

  await client.end();
}

main().catch(console.error);
