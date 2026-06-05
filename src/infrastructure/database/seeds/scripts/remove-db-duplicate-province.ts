import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'postgres',
  password: '123123',
  database: 'rescue_system',
});

interface Province {
  id: number;
  code: number;
  name: string;
  shortName: string;
  createdAt: Date;
}

async function removeDuplicateProvinces() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  // Lấy tất cả provinces, sắp xếp theo createdAt ASC (record cũ hơn giữ lại)
  const provinces = await AppDataSource.query(`
    SELECT id, code, name, "shortName", "createdAt"
    FROM province
    ORDER BY "createdAt" ASC
  `) as Province[];

  console.log(`Tổng record: ${provinces.length}`);

  const seenNames = new Map<string, Province>();
  const duplicates: Province[] = [];

  for (const province of provinces) {
    if (seenNames.has(province.name)) {
      duplicates.push(province);
      continue;
    }
    seenNames.set(province.name, province);
  }

  console.log(`Duplicate found: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log('\n=== Duplicate records (sẽ xóa) ===');
    duplicates.forEach((d) => {
      console.log(`id=${d.id} | code=${d.code} | name=${d.name}`);
    });

    // Cập nhật user_role trỏ về record hợp lệ trước khi xóa
    for (const dup of duplicates) {
      const original = seenNames.get(dup.name);
      if (original) {
        // Update user_role set provinceId = original.id where provinceId = dup.id
        await AppDataSource.query(
          `UPDATE user_role SET "provinceId" = $1 WHERE "provinceId" = $2`,
          [original.id, dup.id]
        );
        console.log(`Updated user_role: provinceId ${dup.id} -> ${original.id} for ${dup.name}`);

        // Update user set provinceId = original.id where provinceId = dup.id
        await AppDataSource.query(
          `UPDATE "user" SET "provinceId" = $1 WHERE "provinceId" = $2`,
          [original.id, dup.id]
        );
        console.log(`Updated user: provinceId ${dup.id} -> ${original.id} for ${dup.name}`);
      }
    }

    // Xóa duplicate
    const duplicateIds = duplicates.map((d) => d.id);
    await AppDataSource.query(
      `DELETE FROM province WHERE id = ANY($1)`,
      [duplicateIds]
    );
    console.log(`\nĐã xóa ${duplicates.length} records duplicate`);
  }

  await AppDataSource.destroy();
  console.log('Done');
}

removeDuplicateProvinces().catch((err) => {
  console.error(err);
  process.exit(1);
});