import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const NEW_PASSWORD = '123456';
const TARGET_PROVINCE_ID = 2;
const TARGET_ROLE_ID = 4; // USER role

// Danh sách user mới sẽ được tạo
const newUsers = [
  {
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@resident.vn',
    phone: '0901111111',
    nationalId: '079201000001',
  },
  {
    fullName: 'Trần Thị B',
    email: 'tranthib@resident.vn',
    phone: '0902222222',
    nationalId: '079201000002',
  },
  {
    fullName: 'Lê Văn C',
    email: 'levanc@resident.vn',
    phone: '0903333333',
    nationalId: '079201000003',
  },
  {
    fullName: 'Phạm Thị D',
    email: 'phamthid@resident.vn',
    phone: '0904444444',
    nationalId: '079201000004',
  },
  {
    fullName: 'Hoàng Văn E',
    email: 'hoangvane@resident.vn',
    phone: '0905555555',
    nationalId: '079201000005',
  },
];

async function resetUsers() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Kết nối database thành công!');

    // Bước 1: Lấy danh sách user cũ có provinceId = 2 và roleId = 4 (USER)
    const oldUsers = await dataSource.query(
      `
      SELECT u.id, u."fullName", u.email, u.phone, u."nationalId"
      FROM "user" u
      JOIN user_role ur ON u.id = ur."userId"
      WHERE u."provinceId" = $1 AND ur."roleId" = $2 AND ur."isActive" = true
    `,
      [TARGET_PROVINCE_ID, TARGET_ROLE_ID],
    );

    console.log(
      `\n🔍 Tìm thấy ${oldUsers.length} user cũ có provinceId=${TARGET_PROVINCE_ID} và role USER`,
    );

    // Bước 2: Xóa user_role entries trước (vì có foreign key)
    if (oldUsers.length > 0) {
      const oldUserIds = oldUsers.map((u: any) => u.id);
      await dataSource.query(
        `
        DELETE FROM user_role WHERE "userId" = ANY($1)
      `,
        [oldUserIds],
      );

      // Xóa các bảng liên quan trước
      await dataSource
        .query(
          `
        DELETE FROM household_profile WHERE "userId" = ANY($1)
      `,
          [oldUserIds],
        )
        .catch(() => {}); // Ignore if table doesn't exist or no records

      await dataSource
        .query(
          `
        DELETE FROM rescue_team_member WHERE "userId" = ANY($1)
      `,
          [oldUserIds],
        )
        .catch(() => {});

      await dataSource
        .query(
          `
        DELETE FROM duty_log WHERE "userId" = ANY($1)
      `,
          [oldUserIds],
        )
        .catch(() => {});

      await dataSource
        .query(
          `
        DELETE FROM sos_request WHERE "userId" = ANY($1)
      `,
          [oldUserIds],
        )
        .catch(() => {});

      await dataSource
        .query(
          `
        DELETE FROM flood_report WHERE "reporterId" = ANY($1)
      `,
          [oldUserIds],
        )
        .catch(() => {});

      await dataSource
        .query(
          `
        DELETE FROM device WHERE "userId" = ANY($1)
      `,
          [oldUserIds],
        )
        .catch(() => {});

      await dataSource
        .query(
          `
        DELETE FROM audit_log WHERE "userId" = ANY($1)
      `,
          [oldUserIds],
        )
        .catch(() => {});

      // Cuối cùng xóa user
      await dataSource.query(
        `
        DELETE FROM "user" WHERE id = ANY($1)
      `,
        [oldUserIds],
      );

      console.log(`🗑️ Đã xóa ${oldUsers.length} user cũ`);
    }

    // Bước 3: Hash password mới
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
    console.log(`\n🔐 Password mới đã hash: ${NEW_PASSWORD}`);

    // Bước 4: Tạo user mới
    console.log(
      `\n👤 Tạo ${newUsers.length} user mới với provinceId=${TARGET_PROVINCE_ID}:`,
    );

    for (const userData of newUsers) {
      // Insert user
      const result = await dataSource.query(
        `
        INSERT INTO "user" (
          "fullName", "email", "phone", "nationalId", "password",
          "provinceId", "dateOfBirth", "gender", "nationalIdVerified",
          "phoneVerified", "emailVerified", "isActive", "isVolunteer", "needsHelp",
          "trustScore"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `,
        [
          userData.fullName,
          userData.email,
          userData.phone,
          userData.nationalId,
          hashedPassword,
          TARGET_PROVINCE_ID,
          new Date('1990-01-01'), // dateOfBirth
          'MALE', // gender
          true, // nationalIdVerified
          true, // phoneVerified
          true, // emailVerified
          true, // isActive
          false, // isVolunteer
          false, // needsHelp
          50, // trustScore
        ],
      );

      const newUserId = result[0].id;

      // Gán role USER cho user mới
      await dataSource.query(
        `
        INSERT INTO user_role ("userId", "roleId", "provinceId", "isActive", "assignedAt")
        VALUES ($1, $2, $3, $4, NOW())
      `,
        [newUserId, TARGET_ROLE_ID, TARGET_PROVINCE_ID, true],
      );

      console.log(
        `  ✅ ${userData.fullName} | Email: ${userData.email} | Phone: ${userData.phone} | Password: ${NEW_PASSWORD}`,
      );
    }

    console.log('\n🎉 Hoàn tất!');
    console.log('\n📋 Thông tin đăng nhập:');
    console.log(`   Province ID: ${TARGET_PROVINCE_ID}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    console.log('\n📋 Danh sách user mới:');
    for (const u of newUsers) {
      console.log(`   - Email: ${u.email} | Phone: ${u.phone}`);
    }
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await dataSource.destroy();
  }
}

resetUsers();
