/**
 * Script fix Team 17 - reset orphaned DISPATCHED status
 * Usage: npx ts-node -r tsconfig-paths/register scratch/fix-team17-status.ts
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

  // Check current state
  console.log('=== BEFORE: Team 17 ===');
  const before = await dataSource.query(`SELECT id, name, status, "activeCasesCount" FROM rescue_team WHERE id = 17`);
  console.log(before[0]);

  // Reset orphaned Team 17
  console.log('\n🔧 Fixing Team 17...');
  await dataSource.query(`
    UPDATE rescue_team
    SET status = 'AVAILABLE', "activeCasesCount" = 0, "updatedAt" = NOW()
    WHERE id = 17 AND status = 'DISPATCHED'
    AND NOT EXISTS (SELECT 1 FROM sos_request WHERE "assignedTeamId" = 17 AND status = 'DISPATCHED')
  `);

  // Verify
  console.log('\n=== AFTER: Team 17 ===');
  const after = await dataSource.query(`SELECT id, name, status, "activeCasesCount" FROM rescue_team WHERE id = 17`);
  console.log(after[0]);

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
