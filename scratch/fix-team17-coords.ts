/**
 * Script fix Team 17 coordinates - tạm thời
 * Usage: npx ts-node -r tsconfig-paths/register scratch/fix-team17-coords.ts
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

  // Check Team 17 and 18 current coords
  console.log('=== BEFORE ===');
  const before = await dataSource.query(`
    SELECT id, name, status,
           ST_X(rt."currentLocation"::geometry) as lng,
           ST_Y(rt."currentLocation"::geometry) as lat
    FROM rescue_team rt WHERE id IN (17, 18)
  `);
  for (const t of before) {
    console.log(`[${t.id}] ${t.name} → (${t.lat}, ${t.lng})`);
  }

  // Hiệp Bình, Thủ Đức, HCM coordinates
  // Team 17: ĐỘI CỨU HỘ TỔNG HỢP - HIỆP BÌNH → move slightly
  // Team 18: ĐỘI CỨU HỘ - BÌNH CHÁNH → keep current (Bình Chánh district)

  console.log('\n🔧 Updating Team 17 coordinates to Hiệp Bình actual location...');

  // Hiệp Bình coordinates: approximately 10.8528, 106.7573
  // Using PostGIS geometry format
  await dataSource.query(`
    UPDATE rescue_team
    SET "currentLocation" = ST_SetSRID(ST_MakePoint(106.7573, 10.8528), 4326),
        "baseLocation" = ST_SetSRID(ST_MakePoint(106.7573, 10.8528), 4326),
        "updatedAt" = NOW()
    WHERE id = 17
  `);

  // Check AFTER
  console.log('\n=== AFTER ===');
  const after = await dataSource.query(`
    SELECT id, name, status,
           ST_X(rt."currentLocation"::geometry) as lng,
           ST_Y(rt."currentLocation"::geometry) as lat
    FROM rescue_team rt WHERE id IN (17, 18)
  `);
  for (const t of after) {
    console.log(`[${t.id}] ${t.name} → (${t.lat}, ${t.lng})`);
  }

  console.log('\n✅ Team 17 coordinates updated!');

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
