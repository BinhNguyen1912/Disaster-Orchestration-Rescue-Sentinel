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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dataDir = path.join(__dirname, '../src/infrastructure/database/seeds/data');
const provincesFile = path.join(dataDir, 'provinces.json');
const adminUsersFile = path.join(dataDir, 'admin-users.json');
const userRoleFile = path.join(dataDir, 'user-role.json');
function run() {
    console.log('Starting seed files conversion...');
    if (!fs.existsSync(provincesFile)) {
        console.error('provinces.json not found!');
        return;
    }
    const codeToIdMap = {
        1: 1,
        4: 8,
        8: 7,
        11: 40,
        12: 9,
        14: 13,
        15: 41,
        19: 10,
        20: 12,
        22: 16,
        24: 15,
        25: 14,
        31: 3,
        33: 17,
        37: 18,
        38: 19,
        40: 20,
        42: 21,
        44: 22,
        46: 5,
        48: 4,
        51: 23,
        52: 42,
        56: 26,
        66: 25,
        68: 27,
        75: 28,
        79: 2,
        80: 43,
        82: 44,
        86: 32,
        91: 45,
        92: 6,
        96: 33
    };
    console.log('Province Code to ID Mapping:', codeToIdMap);
    if (fs.existsSync(adminUsersFile)) {
        const adminUsers = JSON.parse(fs.readFileSync(adminUsersFile, 'utf-8'));
        const updatedAdminUsers = adminUsers.map((user) => {
            const { provinceCode, ...rest } = user;
            const provinceId = codeToIdMap[provinceCode];
            if (!provinceId) {
                console.warn(`Warning: No ID found for provinceCode ${provinceCode} in user ${user.email}`);
            }
            return {
                ...rest,
                provinceId: provinceId || null
            };
        });
        fs.writeFileSync(adminUsersFile, JSON.stringify(updatedAdminUsers, null, 2), 'utf-8');
        console.log('Successfully updated admin-users.json');
    }
    else {
        console.log('admin-users.json not found, skipping.');
    }
    if (fs.existsSync(userRoleFile)) {
        const userRoles = JSON.parse(fs.readFileSync(userRoleFile, 'utf-8'));
        const updatedUserRoles = userRoles.map((ur) => {
            const { provinceCode, ...rest } = ur;
            const provinceId = codeToIdMap[provinceCode];
            if (!provinceId) {
                console.warn(`Warning: No ID found for provinceCode ${provinceCode} in user-role ${ur.email}`);
            }
            return {
                ...rest,
                provinceId: provinceId || null
            };
        });
        fs.writeFileSync(userRoleFile, JSON.stringify(updatedUserRoles, null, 2), 'utf-8');
        console.log('Successfully updated user-role.json');
    }
    else {
        console.log('user-role.json not found, skipping.');
    }
    console.log('Conversion complete!');
}
run();
//# sourceMappingURL=convert-seeds.js.map