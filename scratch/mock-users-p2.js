const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

let env = {};
try {
  const envFile = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/(^["']|["']$)/g, '');
      env[key] = value;
    }
  });
} catch (e) {}

const client = new Client({
  host: env.DB_HOST || 'localhost',
  port: parseInt(env.DB_PORT || '5433', 10),
  user: env.DB_USERNAME || 'postgres',
  password: env.DB_PASSWORD || 'postgres',
  database: env.DB_DATABASE || 'rescue_system',
});

// Vietnamese Names Generator Data
const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const demMale = ['Văn', 'Hữu', 'Minh', 'Đức', 'Quang', 'Duy', 'Quốc', 'Anh', 'Hải', 'Thành', 'Khánh'];
const demFemale = ['Thị', 'Ngọc', 'Kim', 'Thu', 'Như', 'Thảo', 'Phương', 'Hương', 'Mỹ', 'Thanh', 'Bích'];
const tenMale = ['Nam', 'Hải', 'Sơn', 'Lâm', 'Tùng', 'Bách', 'Phong', 'Giang', 'Hùng', 'Cường', 'Dũng', 'Tuấn', 'Tú', 'Bình', 'Long', 'Đạt', 'Quân', 'Thành', 'Trung', 'Tiến'];
const tenFemale = ['Vy', 'Trang', 'Linh', 'Thảo', 'Hương', 'Lan', 'Mai', 'Cúc', 'Trúc', 'Đào', 'Ngọc', 'Hoa', 'Phương', 'Thu', 'Hà', 'Trinh', 'Hạnh', 'Yến', 'Anh', 'Tú'];

const streets = ['Nguyễn Trãi', 'Lê Lợi', 'Cách Mạng Tháng Tám', 'Nguyễn Thị Minh Khai', 'Điện Biên Phủ', 'Ba Tháng Hai', 'Phạm Văn Đồng', 'Võ Văn Kiệt', 'Trần Hưng Đạo', 'Nam Kỳ Khởi Nghĩa', 'Nguyễn Văn Linh', 'Trường Chinh', 'Cộng Hòa', 'Phan Đăng Lưu', 'Hoàng Văn Thụ'];

function generateVietnameseName(gender) {
  const family = ho[Math.floor(Math.random() * ho.length)];
  if (gender === 'MALE') {
    const middle = demMale[Math.floor(Math.random() * demMale.length)];
    const given = tenMale[Math.floor(Math.random() * tenMale.length)];
    return `${family} ${middle} ${given}`;
  } else {
    const middle = demFemale[Math.floor(Math.random() * demFemale.length)];
    const given = tenFemale[Math.floor(Math.random() * tenFemale.length)];
    return `${family} ${middle} ${given}`;
  }
}

function convertToUnsignedString(str) {
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  return str;
}

function getEmailAndUsername(fullName, index) {
  const parts = fullName.split(' ');
  const family = convertToUnsignedString(parts[0]);
  const middle = parts.length > 2 ? convertToUnsignedString(parts[1]) : '';
  const given = convertToUnsignedString(parts[parts.length - 1]);
  
  const familyInit = family ? family[0] : '';
  const middleInit = middle ? middle[0] : '';
  
  const base = `${given}.${familyInit}${middleInit}`;
  const username = `${base}_${index}`;
  const email = `${base}_${index}@resident.vn`;
  return { username, email };
}

async function run() {
  await client.connect();
  console.log('Database connected!');

  // 0. Clear old mock users to prevent unique constraint conflicts and clean up verification ticks
  console.log('Cleaning up old mock users...');
  
  const refIds = new Set();
  const queries = [
    { table: 'rescue_team', columns: ['leaderId', 'createdBy'] },
    { table: 'rescue_team_member', columns: ['userId', 'createdBy'] },
    { table: 'sos_request', columns: ['userId', 'reporterId', 'assignerId', 'resolverId'] },
    { table: 'flood_report', columns: ['reporterId', 'verifierId', 'userId'] },
    { table: 'casualty', columns: ['reporterId', 'confirmerId', 'victimId'] },
    { table: 'donation', columns: ['donorId', 'receiverId', 'distributorId'] },
    { table: 'message', columns: ['senderId'] },
    { table: 'audit_log', columns: ['userId'] },
    { table: 'device', columns: ['userId'] },
  ];

  for (const q of queries) {
    for (const col of q.columns) {
      try {
        const res = await client.query(`SELECT DISTINCT "${col}" FROM "${q.table}" WHERE "${col}" IS NOT NULL`);
        res.rows.forEach(r => {
          if (r[col] !== undefined && r[col] !== null) {
            refIds.add(Number(r[col]));
          }
        });
      } catch (e) {
        console.error(`Error querying ${q.table}.${col}:`, e.message);
      }
    }
  }

  const refIdArray = Array.from(refIds);
  console.log('Referenced User IDs (must not delete):', refIdArray);
  let userSelector = `
    SELECT id FROM "user" 
    WHERE (
      email LIKE '%@resident.vn' 
      OR email LIKE '%@resident.gov.vn' 
      OR email LIKE 'user%hcm@rescue.gov.vn'
    )
  `;
  if (refIdArray.length > 0) {
    userSelector += ` AND id NOT IN (${refIdArray.join(',')})`;
  }

  const toDeleteRes = await client.query(userSelector);
  const toDeleteIds = toDeleteRes.rows.map(r => r.id);

  if (toDeleteIds.length > 0) {
    await client.query(`DELETE FROM user_role WHERE "userId" IN (${toDeleteIds.join(',')})`);
    const deleteUsersRes = await client.query(`DELETE FROM "user" WHERE id IN (${toDeleteIds.join(',')})`);
    console.log(`Deleted ${deleteUsersRes.rowCount} old mock users.`);
  } else {
    console.log('No old mock users to delete.');
  }

  // 1. Fetch HCMC administrative units
  const adminUnitsRes = await client.query('SELECT id, name FROM administrative_unit WHERE "provinceId" = 2');
  const adminUnits = adminUnitsRes.rows;
  console.log(`Loaded ${adminUnits.length} HCMC administrative units from database.`);
  if (adminUnits.length === 0) {
    console.error('Error: No administrative units found for provinceId = 2 in the database.');
    await client.end();
    return;
  }

  // 2. Fetch roles
  const rolesRes = await client.query('SELECT id, name FROM role');
  console.log('Available roles in DB:', rolesRes.rows);

  // 3. Inspect user_role columns
  const userRoleColsRes = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'user_role' 
      AND table_schema = 'public'
  `);
  const userRoleCols = userRoleColsRes.rows.map(r => r.column_name);

  // 4. Find target role ID
  let role = rolesRes.rows.find(r => r.name === 'USER');
  if (!role) {
    role = rolesRes.rows.find(r => r.name === 'RESIDENT' || r.name.includes('USER') || r.name.includes('MEMBER'));
  }
  if (role) {
    console.log(`Found target role '${role.name}' with ID: ${role.id}`);
  }

  // 4.5. Fetch existing unique user identifiers to prevent constraint violations
  const existingUsersRes = await client.query('SELECT "phone", "email", "nationalId" FROM "user"');
  const existingPhones = new Set(existingUsersRes.rows.map(r => r.phone));
  const existingEmails = new Set(existingUsersRes.rows.map(r => r.email).filter(Boolean));
  const existingNationalIds = new Set(existingUsersRes.rows.map(r => r.nationalId));

  // 5. Hash password '123123123'
  console.log('Hashing password "123123123"...');
  const hashedPassword = await bcrypt.hash('123123123', 10);
  console.log('Password hashed.');

  console.log('Creating 100 mock users with real Vietnamese names and HCMC administrative units...');
  
  let successCount = 0;
  for (let i = 1; i <= 100; i++) {
    const gender = i % 2 === 0 ? 'MALE' : 'FEMALE';
    const fullName = generateVietnameseName(gender);

    let phone = '';
    do {
      const randomDigits = String(Math.floor(100000 + Math.random() * 900000));
      phone = `0915${randomDigits}`;
    } while (existingPhones.has(phone));
    existingPhones.add(phone);

    let nationalId = '';
    do {
      const randomSuffix = String(Math.floor(100000 + Math.random() * 900000));
      nationalId = `079${gender === 'MALE' ? '0' : '1'}95${randomSuffix}`;
    } while (existingNationalIds.has(nationalId));
    existingNationalIds.add(nationalId);

    let { username, email } = getEmailAndUsername(fullName, i);
    let finalEmail = email;
    let emailIdx = i;
    while (existingEmails.has(finalEmail)) {
      emailIdx++;
      const emailObj = getEmailAndUsername(fullName, emailIdx);
      finalEmail = emailObj.email;
    }
    existingEmails.add(finalEmail);

    const provinceId = 2; // TP. Hồ Chí Minh

    // Select a random HCMC administrative unit
    const randomUnit = adminUnits[Math.floor(Math.random() * adminUnits.length)];
    const adminUnitId = randomUnit.id;
    const randomStreet = streets[Math.floor(Math.random() * streets.length)];
    const addressDetail = `Số ${Math.floor(Math.random() * 200) + 1} Đường ${randomStreet}, ${randomUnit.name}, TP. Hồ Chí Minh`;
    
    // Insert new user without green tick (isVerified = false, nationalIdVerified = false, etc.)
    const insertUserQuery = `
      INSERT INTO "user" (
        "email", "password", "fullName", "phone", "nationalId",
        "provinceId", "adminUnitId", "addressDetail",
        "nationalIdVerified", "phoneVerified", "emailVerified",
        "gender", "trustScore", "isVerified", "isActive", "isVolunteer", "needsHelp",
        "dateOfBirth", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING id
    `;
    
    const insertRes = await client.query(insertUserQuery, [
      finalEmail,
      hashedPassword,
      fullName,
      phone,
      nationalId,
      provinceId,
      adminUnitId,
      addressDetail,
      false, // nationalIdVerified (no green tick)
      false, // phoneVerified (no green tick)
      false, // emailVerified (no green tick)
      gender,
      80, // trustScore
      false, // isVerified (no green tick)
      true, // isActive
      false, // isVolunteer
      false, // needsHelp
      new Date('1995-05-15')
    ]);
    
    const userId = insertRes.rows[0].id;
    
    // Assign role if found
    if (role) {
      const insertRoleCols = ['"userId"', '"roleId"', '"provinceId"', '"isActive"'];
      const insertRoleVals = [userId, role.id, provinceId, true];
      
      if (userRoleCols.includes('assignedAt')) {
        insertRoleCols.push('"assignedAt"');
        insertRoleVals.push('NOW()');
      } else if (userRoleCols.includes('createdAt')) {
        insertRoleCols.push('"createdAt"');
        insertRoleVals.push('NOW()');
      }
      
      const placeholders = insertRoleVals.map((val, idx) => {
        if (val === 'NOW()') return 'NOW()';
        return `$${idx + 1}`;
      });
      
      const cleanVals = insertRoleVals.filter(val => val !== 'NOW()');
      
      let paramIdx = 1;
      const finalPlaceholders = insertRoleCols.map((col, idx) => {
        const val = insertRoleVals[idx];
        if (val === 'NOW()') return 'NOW()';
        return `$${paramIdx++}`;
      });
      
      const insertRoleQuery = `
        INSERT INTO user_role (${insertRoleCols.join(', ')}) 
        VALUES (${finalPlaceholders.join(', ')})
      `;
      
      await client.query(insertRoleQuery, cleanVals);
    }
    successCount++;
  }
  
  console.log(`\n✅ Successfully seeded ${successCount} mock users with real Vietnamese names, random HCMC administrative units, and no verification ticks (isVerified = false)!`);
  
  await client.end();
}

run().catch(console.error);
