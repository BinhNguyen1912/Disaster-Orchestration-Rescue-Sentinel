/**
 * Script chạy seed user cho một province cụ thể
 * Usage: npx ts-node -r tsconfig-paths/register src/infrastructure/database/seeds/scripts/seed-users-by-province.ts<provinceId>
 *
 * Ví dụ: npx ts-node -r tsconfig-paths/register src/infrastructure/database/seeds/scripts/seed-users-by-province.ts 2
 */

import { DataSource, Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Lấy provinceId từ command line argument
const PROVINCE_ID = parseInt(process.argv[2] || '2', 10);

// Định nghĩa Gender enum cục bộ để tránh lỗi @shared path alias
enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

// Định nghĩa UserEntity cục bộ, không import từ @shared
@Entity('user')
class SeedUserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  provinceId: number;

  @Column({ type: 'int', nullable: true })
  adminUnitId: number;

  @Column({ type: 'varchar' })
  fullName: string;

  @Column({ type: 'varchar', unique: true })
  nationalId: string;

  @Column({ type: 'boolean', default: false })
  nationalIdVerified: boolean;

  @Column({ type: 'timestamp' })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'varchar', unique: true })
  phone: string;

  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  addressDetail: string;

  @Column({ type: 'float', default: 1.0 })
  trustScore: number;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: 'now' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: 'now' })
  updatedAt: Date;
}

// Danh sách adminUnitId (10 giá trị luân phiên)
const ADMIN_UNIT_IDS = [
  5152, 5112, 5111, 5135, 5165, 5045, 5110, 5171, 5059, 5096,
];

const mockUsers = [
  // === SUPER_ADMIN / PROVINCE_ADMIN ===
  {
    fullName: 'Nguyễn Văn Minh',
    nationalId: '079201001234',
    dateOfBirth: new Date('1975-03-15'),
    gender: Gender.MALE,
    phone: '0903123456',
    email: 'minh.nv@admin.gov.vn',
    password: 'Admin@123',
    addressDetail: '123 Nguyễn Trãi, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[0],
  },
  {
    fullName: 'Trần Thị Lan',
    nationalId: '079205001235',
    dateOfBirth: new Date('1980-07-22'),
    gender: Gender.FEMALE,
    phone: '0903123457',
    email: 'lan.tt@admin.gov.vn',
    password: 'Admin@123',
    addressDetail: '45 Lê Lợi, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[1],
  },

  // === COORDINATOR ===
  {
    fullName: 'Lê Hoàng Nam',
    nationalId: '079201001236',
    dateOfBirth: new Date('1985-11-08'),
    gender: Gender.MALE,
    phone: '0903123458',
    email: 'nam.lh@coordinator.gov.vn',
    password: 'Coord@123',
    addressDetail: '78 Pasteur, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[2],
  },
  {
    fullName: 'Phạm Thu Hà',
    nationalId: '079205001237',
    dateOfBirth: new Date('1988-04-30'),
    gender: Gender.FEMALE,
    phone: '0903123459',
    email: 'ha.pt@coordinator.gov.vn',
    password: 'Coord@123',
    addressDetail: '56 Hai Bà Trưng, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[3],
  },

  // === AREA_OFFICER ===
  {
    fullName: 'Hoàng Đức Anh',
    nationalId: '079201001238',
    dateOfBirth: new Date('1979-09-12'),
    gender: Gender.MALE,
    phone: '0903123460',
    email: 'anh.hd@area.gov.vn',
    password: 'Area@123',
    addressDetail: '12 Nguyễn Huệ, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[4],
  },
  {
    fullName: 'Vũ Thị Mai',
    nationalId: '079205001239',
    dateOfBirth: new Date('1982-01-25'),
    gender: Gender.FEMALE,
    phone: '0903123461',
    email: 'mai.vt@area.gov.vn',
    password: 'Area@123',
    addressDetail: '34 Đồng Khởi, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[5],
  },

  // === TEAM_LEADER ===
  {
    fullName: 'Đặng Minh Tuấn',
    nationalId: '079201001240',
    dateOfBirth: new Date('1983-06-18'),
    gender: Gender.MALE,
    phone: '0903123462',
    email: 'tuan.dm@team.gov.vn',
    password: 'Team@123',
    addressDetail: '90 Lý Tự Trọng, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[6],
  },
  {
    fullName: 'Ngô Thị Hương',
    nationalId: '079205001241',
    dateOfBirth: new Date('1986-12-03'),
    gender: Gender.FEMALE,
    phone: '0903123463',
    email: 'huong.nt@team.gov.vn',
    password: 'Team@123',
    addressDetail: '23 Trần Hưng Đạo, Quận 1',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[7],
  },
  {
    fullName: 'Bùi Quang Huy',
    nationalId: '079201001242',
    dateOfBirth: new Date('1981-08-27'),
    gender: Gender.MALE,
    phone: '0903123464',
    email: 'huy.bq@team.gov.vn',
    password: 'Team@123',
    addressDetail: '67 Điện Biên Phủ, Quận 3',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[8],
  },

  // === RESCUE_MEMBER ===
  {
    fullName: 'Đỗ Thị Phương',
    nationalId: '079205001243',
    dateOfBirth: new Date('1990-02-14'),
    gender: Gender.FEMALE,
    phone: '0903123465',
    email: 'phuong.dt@rescue.gov.vn',
    password: 'Rescue@123',
    addressDetail: '15 Võ Văn Tần, Quận 3',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[9],
  },
  {
    fullName: 'Lý Thanh Sơn',
    nationalId: '079201001244',
    dateOfBirth: new Date('1992-05-20'),
    gender: Gender.MALE,
    phone: '0903123466',
    email: 'son.lt@rescue.gov.vn',
    password: 'Rescue@123',
    addressDetail: '42 Võ Thị Sáu, Quận 3',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[0],
  },
  {
    fullName: 'Trịnh Minh Đức',
    nationalId: '079201001245',
    dateOfBirth: new Date('1988-10-07'),
    gender: Gender.MALE,
    phone: '0903123467',
    email: 'duc.tm@rescue.gov.vn',
    password: 'Rescue@123',
    addressDetail: '88 Bà Hạnh, Quận 5',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[1],
  },
  {
    fullName: 'Phan Thị Thảo',
    nationalId: '079205001246',
    dateOfBirth: new Date('1995-03-28'),
    gender: Gender.FEMALE,
    phone: '0903123468',
    email: 'thao.pt@rescue.gov.vn',
    password: 'Rescue@123',
    addressDetail: '19 An Dương Vương, Quận 5',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[2],
  },
  {
    fullName: 'Võ Thanh Hùng',
    nationalId: '079201001247',
    dateOfBirth: new Date('1991-07-11'),
    gender: Gender.MALE,
    phone: '0903123469',
    email: 'hung.vt@rescue.gov.vn',
    password: 'Rescue@123',
    addressDetail: '55 Trần Nhân Tôn, Quận 5',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[3],
  },
  {
    fullName: 'Lê Thị Hồng Nga',
    nationalId: '079205001248',
    dateOfBirth: new Date('1993-09-05'),
    gender: Gender.FEMALE,
    phone: '0903123470',
    email: 'nga.lth@rescue.gov.vn',
    password: 'Rescue@123',
    addressDetail: '33 Lê Hồng Phong, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[4],
  },

  // === RESIDENT ===
  {
    fullName: 'Trần Văn Tám',
    nationalId: '079201001249',
    dateOfBirth: new Date('1960-04-16'),
    gender: Gender.MALE,
    phone: '0903123471',
    email: 'tam.tv@resident.vn',
    password: 'Resident@123',
    addressDetail: '7 Ngô Gia Tự, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[5],
  },
  {
    fullName: 'Nguyễn Thị Bảy',
    nationalId: '079205001250',
    dateOfBirth: new Date('1965-12-22'),
    gender: Gender.FEMALE,
    phone: '0903123472',
    email: 'bay.nt@resident.vn',
    password: 'Resident@123',
    addressDetail: '14 Lý Thường Kiệt, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[6],
  },
  {
    fullName: 'Lê Quốc Bảo',
    nationalId: '079201001251',
    dateOfBirth: new Date('1998-06-30'),
    gender: Gender.MALE,
    phone: '0903123473',
    email: 'bao.lq@resident.vn',
    password: 'Resident@123',
    addressDetail: '61 Sư Vạn Hạnh, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[7],
  },
  {
    fullName: 'Phạm Thị Lan Chi',
    nationalId: '079205001252',
    dateOfBirth: new Date('1972-08-14'),
    gender: Gender.FEMALE,
    phone: '0903123474',
    email: 'chi.ptl@resident.vn',
    password: 'Resident@123',
    addressDetail: '28 Nguyễn Chí Thanh, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[8],
  },
  {
    fullName: 'Hoàng Văn Độ',
    nationalId: '079201001253',
    dateOfBirth: new Date('1958-02-09'),
    gender: Gender.MALE,
    phone: '0903123475',
    email: 'do.hv@resident.vn',
    password: 'Resident@123',
    addressDetail: '92 Tô Hiến Thành, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[9],
  },
  {
    fullName: 'Trương Thị Hạnh',
    nationalId: '079205001254',
    dateOfBirth: new Date('1970-10-01'),
    gender: Gender.FEMALE,
    phone: '0903123476',
    email: 'hanh.tt@resident.vn',
    password: 'Resident@123',
    addressDetail: '36 Bạch Đằng, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[0],
  },
  {
    fullName: 'Nguyễn Thanh Sáng',
    nationalId: '079201001255',
    dateOfBirth: new Date('1987-11-25'),
    gender: Gender.MALE,
    phone: '0903123477',
    email: 'sang.nt@resident.vn',
    password: 'Resident@123',
    addressDetail: '80 Trần Phú, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[1],
  },
  {
    fullName: 'Phan Văn Minh Đức',
    nationalId: '079201001256',
    dateOfBirth: new Date('1996-01-18'),
    gender: Gender.MALE,
    phone: '0903123478',
    email: 'duc.pvm@resident.vn',
    password: 'Resident@123',
    addressDetail: '44 Cao Thắng, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[2],
  },
  {
    fullName: 'Đinh Thị Hồng',
    nationalId: '079205001257',
    dateOfBirth: new Date('1984-07-07'),
    gender: Gender.FEMALE,
    phone: '0903123479',
    email: 'hong.dt@resident.vn',
    password: 'Resident@123',
    addressDetail: '66 Hòa Hảo, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[3],
  },
  {
    fullName: 'Trần Đình Khôi',
    nationalId: '079201001258',
    dateOfBirth: new Date('1999-04-23'),
    gender: Gender.MALE,
    phone: '0903123480',
    email: 'khoi.td@resident.vn',
    password: 'Resident@123',
    addressDetail: '21 Hùng Vương, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[4],
  },
  {
    fullName: 'Lý Thị Hồng Thắm',
    nationalId: '079205001259',
    dateOfBirth: new Date('1968-09-10'),
    gender: Gender.FEMALE,
    phone: '0903123481',
    email: 'tham.lth@resident.vn',
    password: 'Resident@123',
    addressDetail: '99 Lê Lai, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[5],
  },
  {
    fullName: 'Châu Văn Thành',
    nationalId: '079201001260',
    dateOfBirth: new Date('1975-12-05'),
    gender: Gender.MALE,
    phone: '0903123482',
    email: 'thanh.cv@resident.vn',
    password: 'Resident@123',
    addressDetail: '53 Minh Phụng, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[6],
  },
  {
    fullName: 'Nguyễn Thị Mỹ Duyên',
    nationalId: '079205001261',
    dateOfBirth: new Date('1994-08-19'),
    gender: Gender.FEMALE,
    phone: '0903123483',
    email: 'duyen.ntm@resident.vn',
    password: 'Resident@123',
    addressDetail: '71 Số1, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[7],
  },
  {
    fullName: 'Trịnh Văn Phong',
    nationalId: '079201001262',
    dateOfBirth: new Date('1989-03-02'),
    gender: Gender.MALE,
    phone: '0903123484',
    email: 'phong.tv@resident.vn',
    password: 'Resident@123',
    addressDetail: '38 Nguyễn Văn Bảo, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[8],
  },
  {
    fullName: 'Bùi Thị Hồng Gấm',
    nationalId: '079205001263',
    dateOfBirth: new Date('1963-05-27'),
    gender: Gender.FEMALE,
    phone: '0903123485',
    email: 'gam.bth@resident.vn',
    password: 'Resident@123',
    addressDetail: '84 Thành Thái, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[9],
  },
  {
    fullName: 'Đặng Văn Toàn',
    nationalId: '079201001264',
    dateOfBirth: new Date('1997-10-13'),
    gender: Gender.MALE,
    phone: '0903123486',
    email: 'toan.dv@resident.vn',
    password: 'Rescue@123',
    addressDetail: '16 Tân Phú, Quận 10',
    provinceId: PROVINCE_ID,
    adminUnitId: ADMIN_UNIT_IDS[0],
  },
];

async function bootstrap() {
  console.log(
    `🌱 Seeding ${mockUsers.length} mock users for provinceId = ${PROVINCE_ID}...`,
  );

  // Khởi tạo DataSource - hardcoded config như script seed-administrative-unit.ts
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
    entities: [SeedUserEntity],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Database connected');

  const userRepo = dataSource.getRepository(SeedUserEntity);
  let createdCount = 0;
  let skippedCount = 0;

  for (const userData of mockUsers) {
    const existing = await userRepo.findOne({
      where: { nationalId: userData.nationalId },
    });

    if (existing) {
      console.log(`  ⏭️  "${userData.fullName}" đã tồn tại, bỏ qua.`);
      skippedCount++;
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = userRepo.create({
      ...userData,
      password: hashedPassword,
    });

    await userRepo.save(user);
    console.log(
      `  ✅ Created: ${userData.fullName} | adminUnitId=${userData.adminUnitId}`,
    );
    createdCount++;
  }

  console.log('\n📊 Kết quả seed:');
  console.log(`  - Đã tạo mới: ${createdCount}`);
  console.log(`  - Bỏ qua (đã tồn tại): ${skippedCount}`);
  console.log('✅ Hoàn tất seed users!');

  await dataSource.destroy();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
