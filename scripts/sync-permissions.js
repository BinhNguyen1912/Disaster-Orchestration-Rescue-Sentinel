"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const permission_sync_config_1 = require("../src/infrastructure/database/seeds/permission-sync.config");
function loadEnv() {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (!fs.existsSync(envPath))
        return;
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1)
            continue;
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
async function syncPermissions() {
    const stats = {
        permissionsAdded: 0,
        permissionsUpdated: 0,
        permissionsSkipped: 0,
        mappingsAdded: 0,
        mappingsSkipped: 0,
    };
    const dataSource = new typeorm_1.DataSource({
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
            for (const permConfig of (0, permission_sync_config_1.flattenPermissions)(permission_sync_config_1.ROLE_PERMISSION_MATRIX, permission_sync_config_1.MODULE_DESCRIPTIONS, permission_sync_config_1.ACTION_DESCRIPTIONS, permission_sync_config_1.buildPermission)) {
                const existing = await queryRunner.query('SELECT id, name, module, description FROM permission WHERE name = $1', [permConfig.name]);
                let permissionId;
                if (existing.length === 0) {
                    const result = await queryRunner.query(`INSERT INTO permission (name, module, description, "isSystem", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, true, NOW(), NOW())
               RETURNING id`, [permConfig.name, permConfig.module, permConfig.description]);
                    permissionId = result[0].id;
                    stats.permissionsAdded++;
                    console.log(`  ✅ Added: ${permConfig.name} (module: ${permConfig.module})`);
                }
                else {
                    permissionId = existing[0].id;
                    if (existing[0].description !== permConfig.description ||
                        existing[0].module !== permConfig.module) {
                        await queryRunner.query(`UPDATE permission SET description = $1, module = $2, "updatedAt" = NOW()
                 WHERE id = $3`, [permConfig.description, permConfig.module, permissionId]);
                        stats.permissionsUpdated++;
                        console.log(`  📝 Updated: ${permConfig.name} (module: ${permConfig.module})`);
                    }
                    else {
                        stats.permissionsSkipped++;
                    }
                }
                for (const roleId of permConfig.allowedRoleIds) {
                    const existingMapping = await queryRunner.query(`SELECT "roleId", "permissionId" FROM role_permission
               WHERE "roleId" = $1 AND "permissionId" = $2`, [roleId, permissionId]);
                    if (existingMapping.length === 0) {
                        await queryRunner.query(`INSERT INTO role_permission ("roleId", "permissionId", "grantedAt")
                 VALUES ($1, $2, NOW())`, [roleId, permissionId]);
                        stats.mappingsAdded++;
                        console.log(`  ✅ Mapped: roleId=${roleId} → ${permConfig.name}`);
                    }
                    else {
                        stats.mappingsSkipped++;
                    }
                }
            }
            console.log('\n[PermissionSync] 📊 Summary:');
            console.log(`  Permissions: ${stats.permissionsAdded} added, ${stats.permissionsUpdated} updated, ${stats.permissionsSkipped} skipped`);
            console.log(`  Mappings: ${stats.mappingsAdded} added, ${stats.mappingsSkipped} skipped`);
            console.log('[PermissionSync] ✅ Done!\n');
        }
        finally {
            await queryRunner.release();
        }
    }
    catch (error) {
        console.error('[PermissionSync] ❌ Error:', error);
        process.exit(1);
    }
    finally {
        await dataSource.destroy();
    }
}
syncPermissions();
//# sourceMappingURL=sync-permissions.js.map