/**
 * Check centerPoint availability in administrative_unit
 * Usage: npx ts-node -r tsconfig-paths/register scratch/check-adminunit-centerpoint.ts
 */

import { DataSource } from 'typeorm';

async function bootstrap() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  const stats = await dataSource.query(`
    SELECT COUNT(*) as total,
           COUNT("centerPoint") as with_center,
           COUNT(*) FILTER (WHERE "centerPoint" IS NOT NULL) as non_null_count
    FROM administrative_unit
  `);
  console.log('Stats:', stats[0]);

  const sampleWithCenter = await dataSource.query(`
    SELECT id, name, "centerPoint",
           ST_X("centerPoint"::geometry) as lng,
           ST_Y("centerPoint"::geometry) as lat
    FROM administrative_unit
    WHERE "centerPoint" IS NOT NULL
    LIMIT 5
  `);
  console.log('\nSample admin units WITH centerPoint:');
  for (const a of sampleWithCenter) {
    console.log(`[${a.id}] ${a.name} → (${a.lat}, ${a.lng})`);
  }

  const sampleWithoutCenter = await dataSource.query(`
    SELECT id, name
    FROM administrative_unit
    WHERE "centerPoint" IS NULL
    LIMIT 5
  `);
  console.log('\nSample admin units WITHOUT centerPoint:');
  for (const a of sampleWithoutCenter) {
    console.log(`[${a.id}] ${a.name}`);
  }

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
