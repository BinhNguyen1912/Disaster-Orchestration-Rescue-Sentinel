import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const NEW_PASSWORD = '123456';
const TARGET_PROVINCE_ID = 2;
const TARGET_ROLE_NAME = 'USER';

async function updateUsers() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'rescue_db',
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Kết nối database thành công!');

    // Hash password mới
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
    console.log(`🔐 Password mới đã được hash: ${NEW_PASSWORD}`);

    // Tìm roleId của role USER
    const roleResult = await dataSource.query(
      `SELECT id FROM role WHERE name = $1 LIMIT 1`,
      [TARGET_ROLE_NAME],
    );

    if (roleResult.length === 0) {
      console.log(`❌ Không tìm thấy role "${TARGET_ROLE_NAME}"!`);
      return;
    }

    const roleId = roleResult[0].id;
    console.log(`🔍 Role "${TARGET_ROLE_NAME}" có ID = ${roleId}`);

    // Tìm tất cả userId có role USER đang active
    const userRoleResult = await dataSource.query(
      `SELECT "userId" FROM user_role WHERE "roleId" = $1 AND "isActive" = true`,
      [roleId],
    );

    if (userRoleResult.length === 0) {
      console.log('❌ Không có user nào có role USER đang active!');
      return;
    }

    console.log(
      `\n🔍 Tìm thấy ${userRoleResult.length} user có role "${TARGET_ROLE_NAME}"`,
    );

    let updatedCount = 0;
    for (const ur of userRoleResult) {
      const userId = ur.user_id;

      // Cập nhật provinceId và password của user
      await dataSource.query(
        `UPDATE "user" SET "provinceId" = $1, "password" = $2 WHERE id = $3`,
        [TARGET_PROVINCE_ID, hashedPassword, userId],
      );

      // Lấy thông tin user đã cập nhật
      const userResult = await dataSource.query(
        `SELECT id, email, phone FROM "user" WHERE id = $1`,
        [userId],
      );

      if (userResult.length > 0) {
        console.log(
          `  ✅ Đã cập nhật: ID=${userResult[0].id}, Email=${userResult[0].email}, Phone=${userResult[0].phone} -> provinceId=${TARGET_PROVINCE_ID}, password=${NEW_PASSWORD}`,
        );
      }

      updatedCount++;
    }

    console.log(`\n🎉 Hoàn tất! Đã cập nhật ${updatedCount} users.`);
    console.log(`\n📋 Thông tin đăng nhập mới:`);
    console.log(`   - Province ID: ${TARGET_PROVINCE_ID}`);
    console.log(`   - Password: ${NEW_PASSWORD}`);
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await dataSource.destroy();
  }
}

updateUsers();
