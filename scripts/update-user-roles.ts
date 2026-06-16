import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

// Read database environment configuration manually
function loadEnv(): void {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^"|"$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

async function updateUserRoles(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123123',
    database: process.env.DB_NAME || 'rescue_system',
  });

  try {
    await dataSource.initialize();
    console.log('[UpdateUserRoles] 🔄 Connection to database established.\n');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Get all users from the user table
      const users = await queryRunner.query(
        'SELECT id, "provinceId", "addressDetail" FROM "user" ORDER BY id ASC'
      );
      console.log(`[UpdateUserRoles] Found ${users.length} total users.`);

      let updatedCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        const userId = user.id;

        // User 1 must remain unchanged
        if (userId === 1) {
          console.log(`  ℹ️ Skipping User ID: 1 (Maintained unchanged)`);
          skippedCount++;
          continue;
        }

        // Check if user has addressDetail
        const hasAddress = user.addressDetail && user.addressDetail.trim() !== '';
        const targetRoleId = hasAddress ? 4 : 2;

        // Check active role mapping in user_role table
        const existingMapping = await queryRunner.query(
          'SELECT id, "roleId" FROM user_role WHERE "userId" = $1 AND "isActive" = true',
          [userId]
        );

        if (existingMapping.length > 0) {
          const mappingId = existingMapping[0].id;
          const currentRoleId = existingMapping[0].roleId;

          if (currentRoleId !== targetRoleId) {
            // Update to target roleId
            await queryRunner.query(
              'UPDATE user_role SET "roleId" = $1, "assignedAt" = NOW() WHERE id = $2',
              [targetRoleId, mappingId]
            );
            console.log(
              `  🔄 Updated user ID ${userId}: roleId ${currentRoleId} → ${targetRoleId} (hasAddress: ${!!hasAddress})`
            );
            updatedCount++;
          } else {
            console.log(
              `  ✅ User ID ${userId} already has roleId ${targetRoleId} (hasAddress: ${!!hasAddress})`
            );
            skippedCount++;
          }
        } else {
          // Insert a new mapping if none exists
          await queryRunner.query(
            `INSERT INTO user_role ("userId", "roleId", "provinceId", "isActive", "assignedAt")
             VALUES ($1, $2, $3, true, NOW())`,
            [userId, targetRoleId, user.provinceId]
          );
          console.log(
            `  ➕ Assigned new roleId ${targetRoleId} for user ID ${userId} (hasAddress: ${!!hasAddress})`
          );
          updatedCount++;
        }
      }

      console.log('\n[UpdateUserRoles] 📊 Execution Summary:');
      console.log(`  Total processed: ${users.length}`);
      console.log(`  Updated roles:  ${updatedCount}`);
      console.log(`  Skipped/No-op:  ${skippedCount}`);
      console.log('[UpdateUserRoles] ✅ Completed successfully!\n');

    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('[UpdateUserRoles] ❌ Execution failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

updateUserRoles();
