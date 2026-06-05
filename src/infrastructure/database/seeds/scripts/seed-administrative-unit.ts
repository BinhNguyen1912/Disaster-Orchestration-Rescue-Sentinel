import { DataSource } from 'typeorm';
import fs from 'fs/promises';
import path from 'path';

export enum AdministrativeUnitType {
  DISTRICT = 'DISTRICT',
  COMMUNE = 'COMMUNE',
  WARD = 'WARD',
  HAMLET = 'HAMLET',
}

type AdministrativeUnit = {
  id: number;
  provinceId: number;
  parentId: number | null;
  type: AdministrativeUnitType;
  code: string;
  name: string;
  boundary: null;
  centerPoint: null;
};

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'postgres',
  password: '123123',
  database: 'rescue_system',
});

async function seedAdministrativeUnits() {
  await AppDataSource.initialize();
  console.log('Connected to database');

  const dataDir = path.join(__dirname, '..', 'data');
  const raw = await fs.readFile(
    path.join(dataDir, 'administrative-unit.json'),
    'utf-8',
  );

  const units: AdministrativeUnit[] = JSON.parse(raw);

  console.log(`Inserting ${units.length} administrative units...`);

  // Clear existing data
  await AppDataSource.query('DELETE FROM administrative_unit');

  // Insert in batches
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < units.length; i += batchSize) {
    const batch = units.slice(i, i + batchSize);

    const values: any[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const unit of batch) {
      values.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
      );
      params.push(
        unit.provinceId,
        unit.parentId,
        unit.type,
        unit.code,
        unit.name,
        unit.boundary,
        unit.centerPoint,
      );
    }

    await AppDataSource.query(
      `INSERT INTO administrative_unit ("provinceId", "parentId", type, code, name, "boundary", "centerPoint") VALUES ${values.join(', ')}`,
      params,
    );

    inserted += batch.length;
    console.log(`Inserted ${inserted}/${units.length}`);
  }

  console.log('Done!');
  await AppDataSource.destroy();
}

seedAdministrativeUnits().catch((err) => {
  console.error(err);
  process.exit(1);
});
