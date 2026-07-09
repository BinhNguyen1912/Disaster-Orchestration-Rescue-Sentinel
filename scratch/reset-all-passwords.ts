/**
 * Script reset password cho toàn bộ user về "123456"
 * Usage: npx ts-node -r tsconfig-paths/register scratch/reset-all-passwords.ts
 */

import { DataSource, Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const NEW_PASSWORD = '123456';

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

@Entity('user')
class ResetPasswordUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', unique: true })
  phone: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}

async function bootstrap() {
  console.log('🔄 Bắt đầu reset password cho toàn bộ user...');
  console.log(`   Password mới: ${NEW_PASSWORD}`);

  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
    entities: [ResetPasswordUserEntity],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const userRepo = dataSource.getRepository(ResetPasswordUserEntity);

  // Tìm tất cả users chưa bị xóa mềm
  const users = await userRepo.find({
    where: { deletedAt: null as any },
  });

  console.log(`📊 Tìm thấy ${users.length} user(s) chưa bị xóa`);

  if (users.length === 0) {
    console.log('❌ Không có user nào để reset');
    await dataSource.destroy();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);
  let updatedCount = 0;

  for (const user of users) {
    await userRepo.update(user.id, { password: hashedPassword });
    console.log(`  ✅ Updated: ${user.fullName} (phone: ${user.phone}, email: ${user.email || 'N/A'})`);
    updatedCount++;
  }

  console.log('\n📊 Kết quả reset password:');
  console.log(`   - Đã reset: ${updatedCount}`);
  console.log(`   - Mật khẩu mới: ${NEW_PASSWORD}`);
  console.log('✅ Hoàn tất reset password!');

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
