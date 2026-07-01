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

async function run() {
  await client.connect();
  console.log('Database connected!');

  const email = 'admin.hcm2@rescue.gov.vn';
  const username = 'admin_hcm2';
  const fullName = 'Admin TP. Hồ Chí Minh 2';
  const phone = '0909999979';
  const nationalId = '001000000979';
  const provinceId = 2; // TP. Hồ Chí Minh

  // 1. Check if user already exists
  const userCheck = await client.query('SELECT id FROM "user" WHERE email = $1', [email]);
  let userId;
  
  if (userCheck.rows.length > 0) {
    userId = userCheck.rows[0].id;
    console.log(`User ${email} already exists with ID: ${userId}`);
    
    // Update provinceId to 2 just in case
    await client.query('UPDATE "user" SET "provinceId" = $1 WHERE id = $2', [provinceId, userId]);
    console.log(`Updated user provinceId to ${provinceId}`);
  } else {
    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    // Insert new user
    const insertUserQuery = `
      INSERT INTO "user" (
        "email", "password", "fullName", "phone", "nationalId",
        "provinceId", "nationalIdVerified", "phoneVerified", "emailVerified",
        "gender", "trustScore", "isVerified", "isActive", "isVolunteer", "needsHelp",
        "dateOfBirth", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING id
    `;
    
    const insertRes = await client.query(insertUserQuery, [
      email,
      hashedPassword,
      fullName,
      phone,
      nationalId,
      provinceId,
      true, // nationalIdVerified
      true, // phoneVerified
      true, // emailVerified
      'MALE', // gender
      100, // trustScore
      true, // isVerified
      true, // isActive
      false, // isVolunteer
      false, // needsHelp
      new Date('1990-01-01')
    ]);
    
    userId = insertRes.rows[0].id;
    console.log(`Successfully created user ${email} with ID: ${userId}`);
  }

  // 2. Fetch role PROVINCE_ADMIN
  const roleRes = await client.query("SELECT id FROM role WHERE name = 'PROVINCE_ADMIN'");
  if (roleRes.rows.length === 0) {
    console.error("Error: PROVINCE_ADMIN role not found in database!");
    await client.end();
    return;
  }
  const roleId = roleRes.rows[0].id;

  // 3. Clear existing role mappings for this user to avoid conflicts
  await client.query('DELETE FROM user_role WHERE "userId" = $1 AND "roleId" = $2', [userId, roleId]);

  // 4. Assign role PROVINCE_ADMIN to user in provinceId 2
  await client.query(
    'INSERT INTO user_role ("userId", "roleId", "provinceId", "isActive", "createdAt", "updatedAt") VALUES ($1, $2, $3, true, NOW(), NOW())',
    [userId, roleId, provinceId]
  );
  
  console.log(`Successfully assigned role PROVINCE_ADMIN to user ${email} in province ID ${provinceId}`);

  await client.end();
}

run().catch(console.error);
