const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: 'postgresql://postgres:123123@localhost:5433/rescue_system',
  });
  await client.connect();
  const res = await client.query('SELECT u.id, u.email, u.phone, u."fullName", r.name as role FROM "user" u LEFT JOIN user_role ur ON ur.user_id = u.id LEFT JOIN role r ON r.id = ur.role_id');
  console.log('Users in DB:');
  console.table(res.rows);
  await client.end();
}

check().catch(console.error);
