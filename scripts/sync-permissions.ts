/**
 * Permission Sync Script
 *
 * Đồng bộ permissions và role-permission mappings từ config vào DB.
 * Script chạy độc lập, không cần NestJS bootstrap.
 *
 * Chạy: npm run sync:permissions
 *
 * 3 nguyên tắc:
 * 1. Idempotent — chạy nhiều lần cùng kết quả
 * 2. Upsert — chưa có → INSERT, đã có → UPDATE
 * 3. Không auto-delete — tránh mất quyền vô tình
 */

import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import {
  flattenPermissions,
  ROLE_PERMISSION_MATRIX,
  MODULE_DESCRIPTIONS,
  ACTION_DESCRIPTIONS,
  buildPermission,
} from '../src/infrastructure/database/seeds/permission-sync.config';

// Đọc .env file thủ công (không cần dotenv dependency)
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
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

interface SyncStats {
  permissionsAdded: number;
  permissionsUpdated: number;
  permissionsSkipped: number;
  mappingsAdded: number;
  mappingsSkipped: number;
}

async function syncPermissions(): Promise<void> {
  const stats: SyncStats = {
    permissionsAdded: 0,
    permissionsUpdated: 0,
    permissionsSkipped: 0,
    mappingsAdded: 0,
    mappingsSkipped: 0,
  };

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
    console.log('[PermissionSync] 🔄 Syncing permissions...\n');

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      for (const permConfig of flattenPermissions(
        ROLE_PERMISSION_MATRIX,
        MODULE_DESCRIPTIONS,
        ACTION_DESCRIPTIONS,
        buildPermission,
      )) {
          // 1. Check if permission exists
          const existing = await queryRunner.query(
            'SELECT id, name, module, description FROM permission WHERE name = $1',
            [permConfig.name],
          );

          let permissionId: number;

          if (existing.length === 0) {
            // INSERT new permission
            const result = await queryRunner.query(
              `INSERT INTO permission (name, module, description, "isSystem", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, true, NOW(), NOW())
               RETURNING id`,
              [permConfig.name, permConfig.module, permConfig.description],
            );
            permissionId = result[0].id;
            stats.permissionsAdded++;
            console.log(
              `  ✅ Added: ${permConfig.name} (module: ${permConfig.module})`,
            );
          } else {
            permissionId = existing[0].id;

            // UPDATE if description or module changed
            if (
              existing[0].description !== permConfig.description ||
              existing[0].module !== permConfig.module
            ) {
              await queryRunner.query(
                `UPDATE permission SET description = $1, module = $2, "updatedAt" = NOW()
                 WHERE id = $3`,
                [permConfig.description, permConfig.module, permissionId],
              );
              stats.permissionsUpdated++;
              console.log(
                `  📝 Updated: ${permConfig.name} (module: ${permConfig.module})`,
              );
            } else {
              stats.permissionsSkipped++;
            }
          }

          // 2. Sync role-permission mappings
          for (const roleId of permConfig.allowedRoleIds) {
            const existingMapping = await queryRunner.query(
              `SELECT "roleId", "permissionId" FROM role_permission
               WHERE "roleId" = $1 AND "permissionId" = $2`,
              [roleId, permissionId],
            );

            if (existingMapping.length === 0) {
              await queryRunner.query(
                `INSERT INTO role_permission ("roleId", "permissionId", "grantedAt")
                 VALUES ($1, $2, NOW())`,
                [roleId, permissionId],
              );
              stats.mappingsAdded++;
              console.log(
                `  ✅ Mapped: roleId=${roleId} → ${permConfig.name}`,
              );
            } else {
              stats.mappingsSkipped++;
            }
          }
      }

      console.log('\n[PermissionSync] 📊 Summary:');
      console.log(
        `  Permissions: ${stats.permissionsAdded} added, ${stats.permissionsUpdated} updated, ${stats.permissionsSkipped} skipped`,
      );
      console.log(
        `  Mappings: ${stats.mappingsAdded} added, ${stats.mappingsSkipped} skipped`,
      );
      console.log('[PermissionSync] ✅ Done!\n');
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    console.error('[PermissionSync] ❌ Error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

syncPermissions();
