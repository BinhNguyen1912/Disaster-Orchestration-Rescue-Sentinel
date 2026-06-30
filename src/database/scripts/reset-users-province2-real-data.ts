import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const NEW_PASSWORD = '123456';
const TARGET_PROVINCE_ID = 2;
const TARGET_ROLE_ID = 4; // USER role

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
      SELECT u.id, u."fullName", u.email, u.phone, u."nationalId", u."dateOfBirth", u.gender, u."addressDetail"
      FROM "user" u
      JOIN user_role ur ON u.id = ur."userId"
      WHERE u."provinceId" = $1 AND ur."roleId" = $2 AND ur."isActive" = true
    `,
      [TARGET_PROVINCE_ID, TARGET_ROLE_ID],
    );

    console.log(
      `\n🔍 Tìm thấy ${oldUsers.length} user cũ có provinceId=${TARGET_PROVINCE_ID} và role USER`,
    );

    if (oldUsers.length > 0) {
      const oldUserIds = oldUsers.map((u: any) => u.id);

      // Bước 2: Xóa từ bảng con trước (theo đúng thứ tự foreign key)
      console.log('🗑️ Bắt đầu xóa các bảng liên quan...');

      // Xóa user_role trước (vì user tham chiếu đến role)
      await dataSource.query(`DELETE FROM user_role WHERE "userId" = ANY($1)`, [
        oldUserIds,
      ]);
      console.log('  - Đã xóa user_role');

      // Các bảng khác
      await dataSource
        .query(`DELETE FROM household_profile WHERE "userId" = ANY($1)`)
        .catch(() => console.log('  - household_profile không có hoặc lỗi'));
      await dataSource
        .query(`DELETE FROM rescue_team_member WHERE "userId" = ANY($1)`)
        .catch(() => console.log('  - rescue_team_member không có hoặc lỗi'));
      await dataSource
        .query(`DELETE FROM duty_log WHERE "userId" = ANY($1)`)
        .catch(() => console.log('  - duty_log không có hoặc lỗi'));
      await dataSource
        .query(`DELETE FROM sos_request WHERE "userId" = ANY($1)`)
        .catch(() => console.log('  - sos_request không có hoặc lỗi'));
      await dataSource
        .query(`DELETE FROM sos_request WHERE "assignerId" = ANY($1)`)
        .catch(() => {});
      await dataSource
        .query(`DELETE FROM sos_request WHERE "resolverId" = ANY($1)`)
        .catch(() => {});
      await dataSource
        .query(`DELETE FROM flood_report WHERE "reporterId" = ANY($1)`)
        .catch(() => console.log('  - flood_report không có hoặc lỗi'));
      await dataSource
        .query(`DELETE FROM flood_report WHERE "verifierId" = ANY($1)`)
        .catch(() => {});
      await dataSource
        .query(`DELETE FROM device WHERE "userId" = ANY($1)`)
        .catch(() => console.log('  - device không có hoặc lỗi'));
      await dataSource
        .query(`DELETE FROM audit_log WHERE "userId" = ANY($1)`)
        .catch(() => console.log('  - audit_log không có hoặc lỗi'));
      await dataSource
        .query(`DELETE FROM message WHERE "senderId" = ANY($1)`)
        .catch(() => {});
      await dataSource
        .query(`DELETE FROM message_read WHERE "userId" = ANY($1)`)
        .catch(() => {});

      // Cuối cùng xóa user
      await dataSource.query(`DELETE FROM "user" WHERE id = ANY($1)`, [
        oldUserIds,
      ]);
      console.log(`  - Đã xóa ${oldUsers.length} user`);

      console.log(`🗑️ Hoàn tất xóa!`);
    }

    // Bước 3: Hash password mới
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
    console.log(`\n🔐 Password mới đã hash: ${NEW_PASSWORD}`);

    // Bước 4: Tạo lại user với dữ liệu thật
    console.log(
      `\n👤 Tạo lại ${oldUsers.length} user với dữ liệu thật và password mới:`,
    );

    for (const userData of oldUsers as any[]) {
      // Insert user với dữ liệu thật, chỉ đổi password
      await dataSource.query(
        `
        INSERT INTO "user" (
          "fullName", "email", "phone", "nationalId", "password",
          "provinceId", "dateOfBirth", "gender", "nationalIdVerified",
          "phoneVerified", "emailVerified", "isActive", "isVolunteer", "needsHelp",
          "trustScore", "addressDetail"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `,
        [
          userData.fullName,
          userData.email,
          userData.phone,
          userData.nationalId,
          hashedPassword,
          TARGET_PROVINCE_ID,
          userData.dateOfBirth || new Date('1990-01-01'),
          userData.gender || 'MALE',
          true,
          true,
          true,
          true,
          false,
          false,
          50,
          userData.addressDetail || null,
        ],
      );

      // Lấy id vừa insert
      const newUserResult = await dataSource.query(
        `
        SELECT id FROM "user" WHERE "nationalId" = $1 LIMIT 1
      `,
        [userData.nationalId],
      );

      if (newUserResult.length > 0) {
        const newUserId = newUserResult[0].id;

        // Gán role USER cho user mới
        await dataSource.query(
          `
          INSERT INTO user_role ("userId", "roleId", "provinceId", "isActive", "assignedAt")
          VALUES ($1, $2, $3, $4, NOW())
        `,
          [newUserId, TARGET_ROLE_ID, TARGET_PROVINCE_ID, true],
        );

        console.log(
          `  ✅ ${userData.fullName} | ${userData.email || 'N/A'} | ${userData.phone} | Password: ${NEW_PASSWORD}`,
        );
      }
    }

    console.log('\n🎉 Hoàn tất!');
    console.log('\n📋 Thông tin đăng nhập:');
    console.log(`   Province ID: ${TARGET_PROVINCE_ID}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await dataSource.destroy();
  }
}

resetUsers();
