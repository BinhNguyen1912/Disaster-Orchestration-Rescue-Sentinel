const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: '123123',
  database: 'rescue_system'
});

client.connect()
  .then(async () => {
    console.log('Connected to DB');
    
    // 1. Query users and their roles
    const usersRes = await client.query(`
      SELECT u.id, u."fullName", u.phone, u.email, ur."roleId", r.name as "roleName"
      FROM "user" u
      LEFT JOIN "user_role" ur ON u.id = ur."userId"
      LEFT JOIN "role" r ON ur."roleId" = r.id
      LIMIT 10
    `);
    console.log('Sample Users with Roles:', usersRes.rows);
    
    // 2. Query permissions for roleId = 4 (USER)
    const permsRes = await client.query(`
      SELECT p.name
      FROM "role_permission" rp
      JOIN "permission" p ON rp."permissionId" = p.id
      WHERE rp."roleId" = 4
    `);
    console.log('Permissions for Role 4 (USER):', permsRes.rows.map(r => r.name));
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Connection failed:', err.message);
    process.exit(1);
  });
