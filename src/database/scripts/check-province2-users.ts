import { DataSource } from 'typeorm';

async function check() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
  });

  await dataSource.initialize();

  const result = await dataSource.query(`
    SELECT u.id, u."fullName", u.email, u.phone, u."nationalId", u."provinceId", ur."roleId", r.name as "roleName"
    FROM "user" u
    JOIN user_role ur ON u.id = ur."userId"
    JOIN role r ON ur."roleId" = r.id
    WHERE ur."isActive" = true AND u."provinceId" = 2
    ORDER BY u.id
  `);

  console.log('Users with provinceId=2:', JSON.stringify(result, null, 2));

  await dataSource.destroy();
}

check();
