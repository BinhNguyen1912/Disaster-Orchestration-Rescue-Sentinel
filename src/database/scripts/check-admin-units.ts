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

  // Lấy các đơn vị hành chính của TP.HCM (provinceId = 2)
  const result = await dataSource.query(`
    SELECT id, name, "parentId"
    FROM administrative_unit
    WHERE "provinceId" = 2
    ORDER BY id
    LIMIT 50
  `);

  console.log('Các đơn vị hành chính của TP.HCM (provinceId = 2):');
  console.log(JSON.stringify(result, null, 2));

  await dataSource.destroy();
}

check();
