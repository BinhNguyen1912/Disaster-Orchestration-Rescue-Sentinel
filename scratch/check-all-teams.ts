/**
 * Script check ALL rescue teams
 * Usage: npx ts-node -r tsconfig-paths/register scratch/check-all-teams.ts
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

  // Check ALL rescue teams
  console.log('=== ALL RESCUE TEAMS ===');
  const allTeams = await dataSource.query(`
    SELECT rt.id, rt.name, rt.status, rt."provinceId", rt."activeCasesCount",
           rt."currentLocation", rt."baseLocation",
           ST_X(rt."currentLocation"::geometry) as current_lng,
           ST_Y(rt."currentLocation"::geometry) as current_lat,
           p.name as province_name
    FROM rescue_team rt
    LEFT JOIN province p ON p.id = rt."provinceId"
    ORDER BY rt.id
  `);

  for (const t of allTeams) {
    const hasCoords = t.current_lat && t.current_lng ? '✅' : '❌';
    console.log(`[${t.id}] ${t.name} | Status: ${t.status} | Province: ${t.province_name} | Cases: ${t.activeCasesCount} | Coords: ${hasCoords} (${t.current_lat}, ${t.current_lng})`);
  }

  // Check rescue_team entity structure
  console.log('\n=== RESCUE_TEAM TABLE STRUCTURE ===');
  const columns = await dataSource.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'rescue_team'
    ORDER BY ordinal_position
  `);
  for (const c of columns) {
    console.log(`${c.column_name} (${c.data_type}) ${c.is_nullable === 'YES' ? '[nullable]' : '[NOT NULL]'}`);
  }

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
