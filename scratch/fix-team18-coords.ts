/**
 * Script fix Team 18 coordinates - Bình Chánh, HCM
 * Usage: npx ts-node -r tsconfig-paths/register scratch/fix-team18-coords.ts
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

  // Team 18: Bình Chánh, HCM - actual coordinates
  // Bình Chánh center: approximately 10.8077, 106.3715
  console.log('🔧 Updating Team 18 coordinates to Bình Chánh actual location...');

  await dataSource.query(`
    UPDATE rescue_team
    SET "currentLocation" = ST_SetSRID(ST_MakePoint(106.3715, 10.8077), 4326),
        "baseLocation" = ST_SetSRID(ST_MakePoint(106.3715, 10.8077), 4326),
        "updatedAt" = NOW()
    WHERE id = 18
  `);

  // Final check
  console.log('\n=== FINAL: All 3 teams ===');
  const teams = await dataSource.query(`
    SELECT rt.id, rt.name, rt.status,
           ST_X(rt."currentLocation"::geometry) as lng,
           ST_Y(rt."currentLocation"::geometry) as lat
    FROM rescue_team rt
    ORDER BY rt.id
  `);
  for (const t of teams) {
    console.log(`[${t.id}] ${t.name} | Status: ${t.status} | Coords: (${t.lat}, ${t.lng})`);
  }

  console.log('\n✅ Team 18 coordinates updated!');

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
