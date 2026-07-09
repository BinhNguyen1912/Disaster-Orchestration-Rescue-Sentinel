/**
 * Script check team 17 và tình trạng dispatch
 * Usage: npx ts-node -r tsconfig-paths/register scratch/check-team17-dispatch.ts
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

  // 1. Check team 17
  console.log('=== TEAM 17 ===');
  const team17 = await dataSource.query(`
    SELECT rt.id, rt.name, rt.status, rt."provinceId", rt."activeCasesCount",
           rt."currentLocation", rt."baseLocation",
           ST_X(rt."currentLocation"::geometry) as current_lng,
           ST_Y(rt."currentLocation"::geometry) as current_lat,
           ST_X(rt."baseLocation"::geometry) as base_lng,
           ST_Y(rt."baseLocation"::geometry) as base_lat,
           p.name as province_name
    FROM rescue_team rt
    LEFT JOIN province p ON p.id = rt."provinceId"
    WHERE rt.id = 17
  `);

  if (team17.length > 0) {
    const t = team17[0];
    console.log(`ID: ${t.id}`);
    console.log(`Name: ${t.name}`);
    console.log(`Status: ${t.status}`);
    console.log(`Province: ${t.provinceId} (${t.province_name})`);
    console.log(`Active Cases: ${t.activeCasesCount}`);
    console.log(`CurrentLocation: ${t.currentLocation}`);
    console.log(`  → Lng: ${t.current_lng}, Lat: ${t.current_lat}`);
    console.log(`BaseLocation: ${t.baseLocation}`);
    console.log(`  → Lng: ${t.base_lng}, Lat: ${t.base_lat}`);
  } else {
    console.log('Team 17 NOT FOUND');
  }

  // 2. Check all teams in Hiệp Bình province (Thủ Đức = provinceId ~79?)
  console.log('\n=== ALL RESCUE TEAMS (with coordinates) ===');
  const allTeams = await dataSource.query(`
    SELECT rt.id, rt.name, rt.status, rt."provinceId", rt."activeCasesCount",
           ST_X(rt."currentLocation"::geometry) as lng,
           ST_Y(rt."currentLocation"::geometry) as lat,
           p.name as province_name
    FROM rescue_team rt
    LEFT JOIN province p ON p.id = rt."provinceId"
    ORDER BY rt.id
  `);

  for (const t of allTeams) {
    console.log(`[${t.id}] ${t.name} | Status: ${t.status} | Province: ${t.province_name} | Cases: ${t.activeCasesCount} | Location: (${t.lat}, ${t.lng})`);
  }

  // 3. Check SOS with DISPATCHED status
  console.log('\n=== SOS with DISPATCHED status ===');
  const dispatchedSos = await dataSource.query(`
    SELECT sr.id, sr.status, sr."assignedTeamId", sr."provinceId",
           ST_X(sr."location"::geometry) as lng,
           ST_Y(sr."location"::geometry) as lat,
           p.name as province_name
    FROM sos_request sr
    LEFT JOIN province p ON p.id = sr."provinceId"
    WHERE sr.status = 'DISPATCHED'
  `);

  if (dispatchedSos.length === 0) {
    console.log('No DISPATCHED SOS found');
  } else {
    for (const s of dispatchedSos) {
      console.log(`[SOS ${s.id}] Status: ${s.status} | Team: ${s.assignedTeamId} | Province: ${s.province_name} | Location: (${s.lat}, ${s.lng})`);
    }
  }

  // 4. Check teams with DISPATCHED status
  console.log('\n=== Teams with DISPATCHED status ===');
  const dispatchedTeams = await dataSource.query(`
    SELECT rt.id, rt.name, rt.status, rt."activeCasesCount", rt."provinceId",
           p.name as province_name
    FROM rescue_team rt
    LEFT JOIN province p ON p.id = rt."provinceId"
    WHERE rt.status = 'DISPATCHED'
  `);

  if (dispatchedTeams.length === 0) {
    console.log('No DISPATCHED teams found');
  } else {
    for (const t of dispatchedTeams) {
      console.log(`[Team ${t.id}] ${t.name} | Status: ${t.status} | Cases: ${t.activeCasesCount} | Province: ${t.province_name}`);
    }
  }

  // 5. Check dispatch_queue entries
  console.log('\n=== Dispatch Queue entries ===');
  const queueEntries = await dataSource.query(`
    SELECT dq.id, dq."sosRequestId", dq."teamId", dq.status, dq."createdAt"
    FROM dispatch_queue dq
  `);

  if (queueEntries.length === 0) {
    console.log('No dispatch queue entries');
  } else {
    for (const q of queueEntries) {
      console.log(`[Queue ${q.id}] SOS: ${q.sosRequestId} | Team: ${q.teamId} | Status: ${q.status} | Created: ${q.createdAt}`);
    }
  }

  // 6. Find province named "Hiệp Bình"
  console.log('\n=== Province: Hiệp Bình ===');
  const hiepBinh = await dataSource.query(`
    SELECT id, name, code FROM province WHERE name LIKE '%Hiệp Bình%'
  `);
  console.log(hiepBinh);

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
