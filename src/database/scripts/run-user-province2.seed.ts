import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const PROVINCE_ID = 2;

// 31 mock users với dữ liệu thật cho TP.HCM (provinceId = 2)
const mockUsers = [
  // === PROVINCE_ADMIN ===
  {
    fullName: 'Nguyễn Văn Minh',
    nationalId: '079201001234',
    dateOfBirth: '1975-03-15',
    gender: 'MALE',
    phone: '0903123456',
    email: 'minh.nv@admin.gov.vn',
    password: '123456',
    addressDetail: '123 Nguyễn Trãi, Quận 1',
  },
  {
    fullName: 'Trần Thị Lan',
    nationalId: '079205001235',
    dateOfBirth: '1980-07-22',
    gender: 'FEMALE',
    phone: '0903123457',
    email: 'lan.tt@admin.gov.vn',
    password: '123456',
    addressDetail: '45 Lê Lợi, Quận 1',
  },

  // === COORDINATOR ===
  {
    fullName: 'Lê Hoàng Nam',
    nationalId: '079201001236',
    dateOfBirth: '1985-11-08',
    gender: 'MALE',
    phone: '0903123458',
    email: 'nam.lh@coordinator.gov.vn',
    password: '123456',
    addressDetail: '78 Pasteur, Quận 1',
  },
  {
    fullName: 'Phạm Thu Hà',
    nationalId: '079205001237',
    dateOfBirth: '1988-04-30',
    gender: 'FEMALE',
    phone: '0903123459',
    email: 'ha.pt@coordinator.gov.vn',
    password: '123456',
    addressDetail: '56 Hai Bà Trưng, Quận 1',
  },

  // === AREA_OFFICER ===
  {
    fullName: 'Hoàng Đức Anh',
    nationalId: '079201001238',
    dateOfBirth: '1979-09-12',
    gender: 'MALE',
    phone: '0903123460',
    email: 'anh.hd@area.gov.vn',
    password: '123456',
    addressDetail: '12 Nguyễn Huệ, Quận 1',
  },
  {
    fullName: 'Vũ Thị Mai',
    nationalId: '079205001239',
    dateOfBirth: '1982-01-25',
    gender: 'FEMALE',
    phone: '0903123461',
    email: 'mai.vt@area.gov.vn',
    password: '123456',
    addressDetail: '34 Đồng Khởi, Quận 1',
  },

  // === TEAM_LEADER ===
  {
    fullName: 'Đặng Minh Tuấn',
    nationalId: '079201001240',
    dateOfBirth: '1983-06-18',
    gender: 'MALE',
    phone: '0903123462',
    email: 'tuan.dm@team.gov.vn',
    password: '123456',
    addressDetail: '90 Lý Tự Trọng, Quận 1',
  },
  {
    fullName: 'Ngô Thị Hương',
    nationalId: '079205001241',
    dateOfBirth: '1986-12-03',
    gender: 'FEMALE',
    phone: '0903123463',
    email: 'huong.nt@team.gov.vn',
    password: '123456',
    addressDetail: '23 Trần Hưng Đạo, Quận 1',
  },
  {
    fullName: 'Bùi Quang Huy',
    nationalId: '079201001242',
    dateOfBirth: '1981-08-27',
    gender: 'MALE',
    phone: '0903123464',
    email: 'huy.bq@team.gov.vn',
    password: '123456',
    addressDetail: '67 Điện Biên Phủ, Quận 3',
  },

  // === RESCUE_MEMBER ===
  {
    fullName: 'Đỗ Thị Phương',
    nationalId: '079205001243',
    dateOfBirth: '1990-02-14',
    gender: 'FEMALE',
    phone: '0903123465',
    email: 'phuong.dt@rescue.gov.vn',
    password: '123456',
    addressDetail: '15 Võ Văn Tần, Quận 3',
  },
  {
    fullName: 'Lý Thanh Sơn',
    nationalId: '079201001244',
    dateOfBirth: '1992-05-20',
    gender: 'MALE',
    phone: '0903123466',
    email: 'son.lt@rescue.gov.vn',
    password: '123456',
    addressDetail: '42 Võ Thị Sáu, Quận 3',
  },
  {
    fullName: 'Trịnh Minh Đức',
    nationalId: '079201001245',
    dateOfBirth: '1988-10-07',
    gender: 'MALE',
    phone: '0903123467',
    email: 'duc.tm@rescue.gov.vn',
    password: '123456',
    addressDetail: '88 Bà Hạnh, Quận 5',
  },
  {
    fullName: 'Phan Thị Thảo',
    nationalId: '079205001246',
    dateOfBirth: '1995-03-28',
    gender: 'FEMALE',
    phone: '0903123468',
    email: 'thao.pt@rescue.gov.vn',
    password: '123456',
    addressDetail: '19 An Dương Vương, Quận 5',
  },
  {
    fullName: 'Võ Thanh Hùng',
    nationalId: '079201001247',
    dateOfBirth: '1991-07-11',
    gender: 'MALE',
    phone: '0903123469',
    email: 'hung.vt@rescue.gov.vn',
    password: '123456',
    addressDetail: '55 Trần Nhân Tôn, Quận 5',
  },
  {
    fullName: 'Lê Thị Hồng Nga',
    nationalId: '079205001248',
    dateOfBirth: '1993-09-05',
    gender: 'FEMALE',
    phone: '0903123470',
    email: 'nga.lth@rescue.gov.vn',
    password: '123456',
    addressDetail: '33 Lê Hồng Phong, Quận 10',
  },

  // === RESIDENT ===
  {
    fullName: 'Trần Văn Tám',
    nationalId: '079201001249',
    dateOfBirth: '1960-04-16',
    gender: 'MALE',
    phone: '0903123471',
    email: 'tam.tv@resident.vn',
    password: '123456',
    addressDetail: '7 Ngô Gia Tự, Quận 10',
  },
  {
    fullName: 'Nguyễn Thị Bảy',
    nationalId: '079205001250',
    dateOfBirth: '1965-12-22',
    gender: 'FEMALE',
    phone: '0903123472',
    email: 'bay.nt@resident.vn',
    password: '123456',
    addressDetail: '14 Lý Thường Kiệt, Quận 10',
  },
  {
    fullName: 'Lê Quốc Bảo',
    nationalId: '079201001251',
    dateOfBirth: '1998-06-30',
    gender: 'MALE',
    phone: '0903123473',
    email: 'bao.lq@resident.vn',
    password: '123456',
    addressDetail: '61 Sư Vạn Hạnh, Quận 10',
  },
  {
    fullName: 'Phạm Thị Lan Chi',
    nationalId: '079205001252',
    dateOfBirth: '1972-08-14',
    gender: 'FEMALE',
    phone: '0903123474',
    email: 'chi.ptl@resident.vn',
    password: '123456',
    addressDetail: '28 Nguyễn Chí Thanh, Quận 10',
  },
  {
    fullName: 'Hoàng Văn Độ',
    nationalId: '079201001253',
    dateOfBirth: '1958-02-09',
    gender: 'MALE',
    phone: '0903123475',
    email: 'do.hv@resident.vn',
    password: '123456',
    addressDetail: '92 Tô Hiến Thành, Quận 10',
  },
  {
    fullName: 'Trương Thị Hạnh',
    nationalId: '079205001254',
    dateOfBirth: '1970-10-01',
    gender: 'FEMALE',
    phone: '0903123476',
    email: 'hanh.tt@resident.vn',
    password: '123456',
    addressDetail: '36 Bạch Đằng, Quận 10',
  },
  {
    fullName: 'Nguyễn Thanh Sáng',
    nationalId: '079201001255',
    dateOfBirth: '1987-11-25',
    gender: 'MALE',
    phone: '0903123477',
    email: 'sang.nt@resident.vn',
    password: '123456',
    addressDetail: '80 Trần Phú, Quận 10',
  },
  {
    fullName: 'Phan Văn Minh Đức',
    nationalId: '079201001256',
    dateOfBirth: '1996-01-18',
    gender: 'MALE',
    phone: '0903123478',
    email: 'duc.pvm@resident.vn',
    password: '123456',
    addressDetail: '44 Cao Thắng, Quận 10',
  },
  {
    fullName: 'Đinh Thị Hồng',
    nationalId: '079205001257',
    dateOfBirth: '1984-07-07',
    gender: 'FEMALE',
    phone: '0903123479',
    email: 'hong.dt@resident.vn',
    password: '123456',
    addressDetail: '66 Hòa Hảo, Quận 10',
  },
  {
    fullName: 'Trần Đình Khôi',
    nationalId: '079201001258',
    dateOfBirth: '1999-04-23',
    gender: 'MALE',
    phone: '0903123480',
    email: 'khoi.td@resident.vn',
    password: '123456',
    addressDetail: '21 Hùng Vương, Quận 10',
  },
  {
    fullName: 'Lý Thị Hồng Thắm',
    nationalId: '079205001259',
    dateOfBirth: '1968-09-10',
    gender: 'FEMALE',
    phone: '0903123481',
    email: 'tham.lth@resident.vn',
    password: '123456',
    addressDetail: '99 Lê Lai, Quận 10',
  },
  {
    fullName: 'Châu Văn Thành',
    nationalId: '079201001260',
    dateOfBirth: '1975-12-05',
    gender: 'MALE',
    phone: '0903123482',
    email: 'thanh.cv@resident.vn',
    password: '123456',
    addressDetail: '53 Minh Phụng, Quận 10',
  },
  {
    fullName: 'Nguyễn Thị Mỹ Duyên',
    nationalId: '079205001261',
    dateOfBirth: '1994-08-19',
    gender: 'FEMALE',
    phone: '0903123483',
    email: 'duyen.ntm@resident.vn',
    password: '123456',
    addressDetail: '71 Số1, Quận 10',
  },
  {
    fullName: 'Trịnh Văn Phong',
    nationalId: '079201001262',
    dateOfBirth: '1989-03-02',
    gender: 'MALE',
    phone: '0903123484',
    email: 'phong.tv@resident.vn',
    password: '123456',
    addressDetail: '38 Nguyễn Văn Bảo, Quận 10',
  },
  {
    fullName: 'Bùi Thị Hồng Gấm',
    nationalId: '079205001263',
    dateOfBirth: '1963-05-27',
    gender: 'FEMALE',
    phone: '0903123485',
    email: 'gam.bth@resident.vn',
    password: '123456',
    addressDetail: '84 Thành Thái, Quận 10',
  },
  {
    fullName: 'Đặng Văn Toàn',
    nationalId: '079201001264',
    dateOfBirth: '1997-10-13',
    gender: 'MALE',
    phone: '0903123486',
    email: 'toan.dv@resident.vn',
    password: '123456',
    addressDetail: '16 Tân Phú, Quận 10',
  },
];

// Role IDs mapping
const ROLE_IDS: { [key: string]: number } = {
  PROVINCE_ADMIN: 2,
  COORDINATOR: 3,
  AREA_OFFICER: 3,
  TEAM_LEADER: 3,
  RESCUE_MEMBER: 3,
  USER: 4,
};

async function seedUsers() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: '123123',
    database: 'rescue_system',
  });

  await dataSource.initialize();
  console.log('✅ Kết nối database thành công!');

  const hashedPassword = await bcrypt.hash('123456', SALT_ROUNDS);

  console.log(
    `\n🌱 Bắt đầu seed ${mockUsers.length} users cho provinceId = ${PROVINCE_ID}...`,
  );

  let created = 0;
  let skipped = 0;

  for (const user of mockUsers) {
    // Kiểm tra user đã tồn tại chưa
    const existing = await dataSource.query(
      `SELECT id FROM "user" WHERE "nationalId" = $1`,
      [user.nationalId],
    );

    if (existing.length > 0) {
      console.log(
        `  ⏭️  ${user.fullName} (${user.nationalId}) - đã tồn tại, bỏ qua`,
      );
      skipped++;
      continue;
    }

    // Insert user (không có adminUnitId để tránh FK constraint)
    const result = await dataSource.query(
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
        user.fullName,
        user.email,
        user.phone,
        user.nationalId,
        hashedPassword,
        PROVINCE_ID,
        user.dateOfBirth,
        user.gender,
        true, // nationalIdVerified
        true, // phoneVerified
        true, // emailVerified
        true, // isActive
        false, // isVolunteer
        false, // needsHelp
        50, // trustScore
        user.addressDetail,
      ],
    );

    const newUserId = result[0].id;

    // Xác định roleId dựa trên loại user
    let roleId = ROLE_IDS.USER; // default
    if (user.email.includes('@admin.gov.vn')) {
      roleId = ROLE_IDS.PROVINCE_ADMIN;
    } else if (user.email.includes('@coordinator.gov.vn')) {
      roleId = ROLE_IDS.COORDINATOR;
    } else if (user.email.includes('@area.gov.vn')) {
      roleId = ROLE_IDS.AREA_OFFICER;
    } else if (
      user.email.includes('@team.gov.vn') ||
      user.email.includes('@rescue.gov.vn')
    ) {
      roleId = ROLE_IDS.RESCUE_MEMBER;
    } else {
      roleId = ROLE_IDS.USER;
    }

    // Gán role
    await dataSource.query(
      `
      INSERT INTO user_role ("userId", "roleId", "provinceId", "isActive", "assignedAt")
      VALUES ($1, $2, $3, $4, NOW())
    `,
      [newUserId, roleId, PROVINCE_ID, true],
    );

    console.log(
      `  ✅ ${user.fullName} | ${user.email} | Password: 123456 | RoleID: ${roleId}`,
    );
    created++;
  }

  console.log(`\n🎉 Hoàn tất!`);
  console.log(`   - Đã tạo mới: ${created} users`);
  console.log(`   - Bỏ qua (đã tồn tại): ${skipped} users`);
  console.log(`\n📋 Thông tin đăng nhập chung:`);
  console.log(`   Province ID: ${PROVINCE_ID}`);
  console.log(`   Password: 123456`);

  await dataSource.destroy();
}

seedUsers().catch(console.error);
