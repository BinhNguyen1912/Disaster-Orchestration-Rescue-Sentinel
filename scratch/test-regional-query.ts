import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function main() {
  console.log('Bootstrapping NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  try {
    console.log('--- Test 1: Grouping by province (provinceId is null) ---');
    const resProvinces = await dataSource.query(`
      SELECT 
        p.name as region,
        COUNT(s.id)::int as count
      FROM sos_request s
      INNER JOIN province p ON s."provinceId" = p.id
      GROUP BY p.id, p.name
      ORDER BY count DESC
      LIMIT 5
    `);
    console.log('Result provinces:', resProvinces);

    console.log('--- Test 2: Grouping by admin unit (provinceId is 2) ---');
    const resAdminUnits = await dataSource.query(`
      SELECT 
        au.name as region,
        COUNT(s.id)::int as count
      FROM sos_request s
      INNER JOIN administrative_unit au ON s."adminUnitId" = au.id
      WHERE s."provinceId" = $1
      GROUP BY au.id, au.name
      ORDER BY count DESC
      LIMIT 5
    `, [2]);
    console.log('Result admin units:', resAdminUnits);

  } catch (err) {
    console.error('Query Failed:', err.message);
  }

  await app.close();
}

main().catch(console.error);
