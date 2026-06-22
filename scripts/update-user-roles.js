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
async function updateUserRoles() {
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
        console.log('[UpdateUserRoles] 🔄 Connection to database established.\n');
        const queryRunner = dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            const users = await queryRunner.query('SELECT id, "provinceId", "addressDetail" FROM "user" ORDER BY id ASC');
            console.log(`[UpdateUserRoles] Found ${users.length} total users.`);
            let updatedCount = 0;
            let skippedCount = 0;
            for (const user of users) {
                const userId = user.id;
                if (userId === 1) {
                    console.log(`  ℹ️ Skipping User ID: 1 (Maintained unchanged)`);
                    skippedCount++;
                    continue;
                }
                const hasAddress = user.addressDetail && user.addressDetail.trim() !== '';
                const targetRoleId = hasAddress ? 4 : 2;
                const existingMapping = await queryRunner.query('SELECT id, "roleId" FROM user_role WHERE "userId" = $1 AND "isActive" = true', [userId]);
                if (existingMapping.length > 0) {
                    const mappingId = existingMapping[0].id;
                    const currentRoleId = existingMapping[0].roleId;
                    if (currentRoleId !== targetRoleId) {
                        await queryRunner.query('UPDATE user_role SET "roleId" = $1, "assignedAt" = NOW() WHERE id = $2', [targetRoleId, mappingId]);
                        console.log(`  🔄 Updated user ID ${userId}: roleId ${currentRoleId} → ${targetRoleId} (hasAddress: ${!!hasAddress})`);
                        updatedCount++;
                    }
                    else {
                        console.log(`  ✅ User ID ${userId} already has roleId ${targetRoleId} (hasAddress: ${!!hasAddress})`);
                        skippedCount++;
                    }
                }
                else {
                    await queryRunner.query(`INSERT INTO user_role ("userId", "roleId", "provinceId", "isActive", "assignedAt")
             VALUES ($1, $2, $3, true, NOW())`, [userId, targetRoleId, user.provinceId]);
                    console.log(`  ➕ Assigned new roleId ${targetRoleId} for user ID ${userId} (hasAddress: ${!!hasAddress})`);
                    updatedCount++;
                }
            }
            console.log('\n[UpdateUserRoles] 📊 Execution Summary:');
            console.log(`  Total processed: ${users.length}`);
            console.log(`  Updated roles:  ${updatedCount}`);
            console.log(`  Skipped/No-op:  ${skippedCount}`);
            console.log('[UpdateUserRoles] ✅ Completed successfully!\n');
        }
        finally {
            await queryRunner.release();
        }
    }
    catch (error) {
        console.error('[UpdateUserRoles] ❌ Execution failed:', error);
        process.exit(1);
    }
    finally {
        await dataSource.destroy();
    }
}
updateUserRoles();
//# sourceMappingURL=update-user-roles.js.map