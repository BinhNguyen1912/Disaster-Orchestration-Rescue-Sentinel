import * as fs from 'fs';
import * as path from 'path';

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
  
  // 1. Build code -> id mapping using the exact user's DB values
  const codeToIdMap: Record<number, number> = {
    1: 1,    // Hà Nội
    4: 8,    // Cao Bằng
    8: 7,    // Tuyên Quang
    11: 40,  // Điện Biên
    12: 9,   // Lào Cai (originally Lai Chau code 12, but DB has code 12 name Lào Cai)
    14: 13,  // Sơn La
    15: 41,  // Lào Cai
    19: 10,  // Thái Nguyên
    20: 12,  // Lạng Sơn
    22: 16,  // Quảng Ninh
    24: 15,  // Bắc Ninh
    25: 14,  // Phú Thọ
    31: 3,   // Hải Phòng
    33: 17,  // Hưng Yên
    37: 18,  // Ninh Bình
    38: 19,  // Thanh Hóa
    40: 20,  // Nghệ An
    42: 21,  // Hà Tĩnh
    44: 22,  // Quảng Trị
    46: 5,   // Huế
    48: 4,   // Đà Nẵng
    51: 23,  // Quảng Ngãi
    52: 42,  // Gia Lai
    56: 26,  // Khánh Hòa
    66: 25,  // Đắk Lắk
    68: 27,  // Lâm Đồng
    75: 28,  // Đồng Nai
    79: 2,   // TP. Hồ Chí Minh
    80: 43,  // Tây Ninh
    82: 44,  // Đồng Tháp
    86: 32,  // Vĩnh Long
    91: 45,  // An Giang
    92: 6,   // Cần Thơ
    96: 33   // Cà Mau
  };
  
  console.log('Province Code to ID Mapping:', codeToIdMap);
  
  // 2. Convert admin-users.json
  if (fs.existsSync(adminUsersFile)) {
    const adminUsers = JSON.parse(fs.readFileSync(adminUsersFile, 'utf-8'));
    const updatedAdminUsers = adminUsers.map((user: any) => {
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
  } else {
    console.log('admin-users.json not found, skipping.');
  }

  // 3. Convert user-role.json
  if (fs.existsSync(userRoleFile)) {
    const userRoles = JSON.parse(fs.readFileSync(userRoleFile, 'utf-8'));
    const updatedUserRoles = userRoles.map((ur: any) => {
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
  } else {
    console.log('user-role.json not found, skipping.');
  }
  
  console.log('Conversion complete!');
}

run();
